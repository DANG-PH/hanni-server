import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  ReviewType,
  SrsState,
  type UserWordProgress,
} from '@prisma/client';
import { startOfLocalDayInstant } from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { AppEvent, type WordReviewedPayload } from '../../events/events';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { QueueQueryDto, ReviewDto } from './dto/srs.dto';
import { LEECH_LAPSES } from './scheduler/sm2.scheduler';
import { SchedulerRegistry } from './scheduler/scheduler.registry';
import type { SchedulerInput } from './scheduler/scheduler.types';

const LEARNED_INTERVAL_DAYS = 21;
const ACTIVE_STATES: SrsState[] = [
  SrsState.LEARNING,
  SrsState.REVIEW,
  SrsState.RELEARNING,
];

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SchedulerRegistry,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get cutoffHour(): number {
    return this.config.get('STREAK_DAY_CUTOFF_HOUR', { infer: true });
  }

  // ---------- nộp 1 lượt review ----------

  async review(userId: string, dto: ReviewDto) {
    const [user, word] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true },
      }),
      this.prisma.word.findUnique({ where: { id: dto.wordId } }),
    ]);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    const settings = user.settings;
    const schedulerName = settings?.srsScheduler ?? 'sm2';
    const targetRetention = settings?.targetRetention ?? 0.9;
    const now = new Date();

    const existing = await this.prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId, wordId: dto.wordId } },
    });

    const before = existing ?? {
      state: SrsState.NEW,
      reps: 0,
      lapses: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      stability: null as number | null,
      difficulty: null as number | null,
      lastReviewedAt: null as Date | null,
    };

    const input: SchedulerInput = {
      state: before.state,
      reps: before.reps,
      lapses: before.lapses,
      easeFactor: before.easeFactor,
      intervalDays: before.intervalDays,
      stability: before.stability,
      difficulty: before.difficulty,
      lastReviewedAt: before.lastReviewedAt,
      rating: dto.rating,
      now,
      timezone: user.timezone,
      cutoffHour: this.cutoffHour,
      targetRetention,
    };

    const out = this.registry.get(schedulerName).schedule(input);

    const reviewType: ReviewType =
      before.state === SrsState.NEW
        ? ReviewType.LEARN
        : before.state === SrsState.RELEARNING
          ? ReviewType.RELEARN
          : ReviewType.REVIEW;

    const elapsedDays = before.lastReviewedAt
      ? (now.getTime() - before.lastReviewedAt.getTime()) / 86_400_000
      : 0;

    const nowLearned =
      out.state === SrsState.REVIEW &&
      out.intervalDays >= LEARNED_INTERVAL_DAYS;

    const progressData = {
      hskLevel: word.hskLevel,
      state: out.state,
      dueAt: out.dueAt,
      lastReviewedAt: now,
      reps: out.reps,
      lapses: out.lapses,
      lastRating: dto.rating,
      // Gỡ đánh dấu "từ khó nhớ" khi cuối cùng đã nhớ được: sai nhiều lần
      // nhưng nay đã đạt chu kỳ ôn của từ đã thuộc thì không còn khó nữa.
      // Trước đây `isLeech` một khi bật là bật MÃI, nên từ đã nhớ vẫn nằm
      // trong danh sách "Từ khó nhớ" ở /progress — vừa sai vừa làm người học
      // nản vì danh sách chỉ dài thêm, không bao giờ ngắn lại.
      isLeech: out.lapses >= LEECH_LAPSES && !nowLearned,
      easeFactor: out.easeFactor,
      intervalDays: out.intervalDays,
      stability: out.stability,
      difficulty: out.difficulty,
    };

    const progress = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.userWordProgress.upsert({
        where: { userId_wordId: { userId, wordId: dto.wordId } },
        create: {
          userId,
          wordId: dto.wordId,
          ...progressData,
          learnedAt: nowLearned ? now : null,
        },
        update: {
          ...progressData,
          ...(nowLearned && !existing?.learnedAt ? { learnedAt: now } : {}),
        },
      });

      await tx.reviewLog.create({
        data: {
          userId,
          wordId: dto.wordId,
          progressId: saved.id,
          studySessionId: dto.studySessionId ?? null,
          rating: dto.rating,
          reviewType,
          reviewedAt: now,
          stateBefore: before.state,
          stateAfter: out.state,
          intervalBefore: before.intervalDays,
          intervalAfter: out.intervalDays,
          easeBefore: before.easeFactor,
          easeAfter: out.easeFactor,
          stabilityBefore: before.stability,
          stabilityAfter: out.stability,
          difficultyBefore: before.difficulty,
          difficultyAfter: out.difficulty,
          elapsedDays,
          scheduledDays: out.intervalDays,
          durationMs: dto.durationMs ?? null,
        },
      });

      if (dto.studySessionId) {
        await tx.studySession.updateMany({
          where: { id: dto.studySessionId, userId, endedAt: null },
          data: {
            cardsReviewed: { increment: 1 },
            cardsCorrect: { increment: out.isCorrect ? 1 : 0 },
            newCards: { increment: reviewType === ReviewType.LEARN ? 1 : 0 },
          },
        });
      }

      return saved;
    });

    const payload: WordReviewedPayload = {
      userId,
      wordId: dto.wordId,
      hskLevel: word.hskLevel,
      rating: dto.rating,
      isCorrect: out.isCorrect,
      becameLearned: nowLearned && !existing?.learnedAt,
      durationMs: dto.durationMs,
      at: now.toISOString(),
    };
    this.events.emit(AppEvent.WordReviewed, payload);

    return {
      progress,
      isCorrect: out.isCorrect,
      dueAt: out.dueAt,
      intervalDays: out.intervalDays,
      state: out.state,
    };
  }

  /**
   * Người dùng chủ động "lưu" 1 từ (vd. bấm vào từ trong bản chép video) —
   * KHÔNG đi qua bộ lịch SM2/FSRS (chưa review thật lần nào). Tạo thẳng
   * `UserWordProgress` ở state LEARNING (không phải NEW — NEW trong hệ này
   * là ảo, nghĩa là "chưa có dòng nào", không phải 1 giá trị lưu thật) với
   * `dueAt` = ngay bây giờ, cùng các field mặc định giống hệt trạng thái
   * "trước lần review đầu tiên" (xem `before` mặc định ở review() phía
   * trên) — để nó xuất hiện ngay trong `dueRows` của getQueue() ở lượt gọi
   * tiếp theo mà không phải sửa logic getQueue()/newRows vốn chỉ quét theo
   * lessonId/hskLevel chứ không theo từ người dùng tự chọn. Idempotent: đã
   * có dòng progress (bất kỳ state nào) thì bỏ qua, không ghi đè tiến độ
   * đã có.
   */
  async addWord(userId: string, wordId: string) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    const existing = await this.prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    if (existing) return { added: false };

    await this.prisma.userWordProgress.create({
      data: {
        userId,
        wordId,
        hskLevel: word.hskLevel,
        state: SrsState.LEARNING,
        dueAt: new Date(),
        reps: 0,
        lapses: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        stability: null,
        difficulty: null,
      },
    });
    return { added: true };
  }

  // ---------- hàng đợi ôn ----------

  async getQueue(userId: string, query: QueueQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const now = new Date();
    const dayStart = startOfLocalDayInstant(
      now,
      user.timezone,
      this.cutoffHour,
    );
    const limit = query.limit ?? 60;
    const newPerDay = user.settings?.newCardsPerDay ?? 10;
    const maxReviewsPerDay = user.settings?.maxReviewsPerDay ?? null;

    // Học theo BÀI: bỏ giới hạn từ mới/ngày, nạp cả bài (tối đa 25).
    const byLesson = Boolean(query.lessonId);
    const levelFilter = query.level ? { hskLevel: query.level } : {};
    const wordScope = query.lessonId
      ? { word: { lessonId: query.lessonId } }
      : levelFilter;
    const dueWhere: Prisma.UserWordProgressWhereInput = {
      userId,
      isSuspended: false,
      state: { in: ACTIVE_STATES },
      dueAt: { lte: now },
      ...wordScope,
    };

    const [newDoneToday, reviewsDoneToday, dueCount] = await Promise.all([
      this.prisma.reviewLog.count({
        where: { userId, reviewType: 'LEARN', reviewedAt: { gte: dayStart } },
      }),
      this.prisma.reviewLog.count({
        where: { userId, reviewedAt: { gte: dayStart } },
      }),
      this.prisma.userWordProgress.count({ where: dueWhere }),
    ]);

    // maxReviewsPerDay chặn số lượt ôn (không tính từ mới) lấy ra trong 1
    // lần gọi hàng đợi — vẫn cho biết tổng số thực sự đến hạn qua `dueCount`
    // (không giới hạn) để FE biết còn tồn đọng bao nhiêu.
    const dueTake =
      maxReviewsPerDay != null
        ? Math.max(0, Math.min(limit, maxReviewsPerDay - reviewsDoneToday))
        : limit;
    const dueRows =
      dueTake > 0
        ? await this.prisma.userWordProgress.findMany({
            where: dueWhere,
            include: { word: true },
            orderBy: [{ dueAt: 'asc' }, { easeFactor: 'asc' }],
            take: dueTake,
          })
        : [];

    const newRemaining = byLesson ? 25 : Math.max(0, newPerDay - newDoneToday);
    const newRows =
      newRemaining > 0
        ? await this.prisma.word.findMany({
            where: query.lessonId
              ? { lessonId: query.lessonId, progress: { none: { userId } } }
              : { ...levelFilter, progress: { none: { userId } } },
            orderBy: query.lessonId
              ? [{ lessonOrder: 'asc' }]
              : [{ frequencyRank: 'asc' }, { simplified: 'asc' }],
            take: newRemaining,
          })
        : [];

    return {
      due: dueRows.map((r) => ({
        progressId: r.id,
        state: r.state,
        dueAt: r.dueAt,
        reps: r.reps,
        intervalDays: r.intervalDays,
        word: r.word,
      })),
      newCards: newRows.map((w) => ({ state: SrsState.NEW, word: w })),
      counts: {
        due: dueCount,
        newRemaining,
        newDoneToday,
        reviewsDoneToday,
      },
    };
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    const now = new Date();
    const dayStart = startOfLocalDayInstant(
      now,
      user.timezone,
      this.cutoffHour,
    );
    const newPerDay = user.settings?.newCardsPerDay ?? 10;

    // "Sắp quên" = đến hạn trong 24h tới. Động lực quay lại mạnh hơn hẳn
    // "đến hạn ôn": người ta ngại MẤT cái đã có hơn là ngại bỏ lỡ việc mới.
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
      dueNow,
      atRisk,
      learnedTotal,
      inProgress,
      reviewsDoneToday,
      newDoneToday,
      leechCount,
      suspendedCount,
    ] = await Promise.all([
      this.prisma.userWordProgress.count({
        where: {
          userId,
          isSuspended: false,
          state: { in: ACTIVE_STATES },
          dueAt: { lte: now },
        },
      }),
      this.prisma.userWordProgress.count({
        where: {
          userId,
          isSuspended: false,
          state: { in: ACTIVE_STATES },
          dueAt: { gt: now, lte: soon },
        },
      }),
      this.prisma.userWordProgress.count({
        where: { userId, learnedAt: { not: null } },
      }),
      // Từ đang ẩn KHÔNG tính vào "vốn từ đang học": ẩn 1 từ chưa từng học
      // cũng tạo ra 1 dòng tiến độ (xem setSuspended), không trừ ra thì con
      // số này tăng mà người dùng chẳng học thêm gì.
      this.prisma.userWordProgress.count({
        where: { userId, isSuspended: false },
      }),
      this.prisma.reviewLog.count({
        where: { userId, reviewedAt: { gte: dayStart } },
      }),
      this.prisma.reviewLog.count({
        where: { userId, reviewType: 'LEARN', reviewedAt: { gte: dayStart } },
      }),
      this.prisma.userWordProgress.count({
        where: { userId, isLeech: true },
      }),
      this.prisma.userWordProgress.count({
        where: { userId, isSuspended: true },
      }),
    ]);

    return {
      dueNow,
      atRisk,
      learnedTotal,
      inProgress,
      reviewsDoneToday,
      newDoneToday,
      newRemaining: Math.max(0, newPerDay - newDoneToday),
      leechCount,
      suspendedCount,
    };
  }

  /** "Từ khó nhớ" (leech, thuật ngữ Anki) — từ đã sai đủ `LEECH_LAPSES` lần
   * (8 lần, xem sm2.scheduler.ts). Field `isLeech` đã tính + lưu đúng mỗi
   * lần review từ trước tới giờ (`review()` ở trên) nhưng CHƯA có API nào
   * đọc lại — cả 2 phía server/client đều chưa dùng tới, tận dụng ngay vì
   * đây là tín hiệu SRS giá trị thật (Anki coi đây là công cụ quan trọng
   * giúp người học biết chính xác từ nào cần chú ý nhiều hơn) mà không tốn
   * gì thêm để tính lại. Sắp theo `lapses` giảm dần — từ sai nhiều nhất lên
   * đầu. Không lọc theo `dueAt` (khác `getQueue()`) vì đây là màn "xem toàn
   * bộ từ khó", không phải hàng đợi ôn hôm nay — từ khó có thể chưa tới hạn
   * ôn lại nhưng vẫn đáng để người học biết mình từng sai nhiều lần. */
  /**
   * Ẩn / bỏ ẩn 1 từ khỏi mọi hàng đợi ôn — "tôi biết từ này rồi".
   *
   * `UserWordProgress.isSuspended` đã được ĐỌC đúng ở khắp nơi từ lâu
   * (`getQueue()`, `getStats()`, `progress.service`, `reminder.service`)
   * nhưng CHƯA CÓ chỗ nào GHI — field mồ côi y hệt `isLeech` trước đây.
   *
   * Vì sao đáng làm: người Việt học tiếng Trung gặp rất nhiều từ đã biết sẵn
   * qua âm Hán Việt (chính Hanni có hẳn trang `/tu-da-biet` liệt kê 773 từ
   * như vậy) — bắt họ ôn đi ôn lại những từ đó là lý do bỏ app rất thật.
   *
   * Từ CHƯA từng học thì tạo sẵn một dòng tiến độ đang ẩn: `getQueue()` lấy
   * từ mới bằng `progress: { none: { userId } }` nên chỉ cần TỒN TẠI dòng là
   * từ đó không vào hàng đợi nữa.
   *
   * CỐ Ý KHÔNG đánh dấu `learnedAt` cho từ bị ẩn dù người dùng nói "đã biết":
   * "từ đã thuộc" là một tiêu chí BẢNG XẾP HẠNG, cho tự khai là mở đường
   * gian lận. Ẩn chỉ có nghĩa "đừng hỏi tôi nữa", không phải "tôi đã thuộc".
   */
  async setSuspended(userId: string, wordId: string, suspended: boolean) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    await this.prisma.userWordProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: { isSuspended: suspended },
      create: {
        userId,
        wordId,
        hskLevel: word.hskLevel,
        state: SrsState.NEW,
        isSuspended: suspended,
        dueAt: null,
      },
    });
    return { wordId, suspended };
  }

  /** Danh sách từ đang ẩn — để người dùng bỏ ẩn khi đổi ý. */
  async getSuspended(userId: string) {
    const rows = await this.prisma.userWordProgress.findMany({
      where: { userId, isSuspended: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        word: {
          select: {
            id: true,
            simplified: true,
            pinyin: true,
            meaningVi: true,
            hanViet: true,
            hskLevel: true,
            audioUrl: true,
          },
        },
      },
    });
    return rows.map((r) => ({ word: r.word, hiddenAt: r.updatedAt }));
  }

  async getLeeches(userId: string) {
    const rows = await this.prisma.userWordProgress.findMany({
      where: { userId, isLeech: true },
      orderBy: { lapses: 'desc' },
      include: {
        word: {
          select: {
            id: true,
            simplified: true,
            pinyin: true,
            meaningVi: true,
            hanViet: true,
            hskLevel: true,
            audioUrl: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      word: r.word,
      lapses: r.lapses,
      dueAt: r.dueAt,
    }));
  }
}

export type { UserWordProgress };
