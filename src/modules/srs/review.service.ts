import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  And,
  DataSource,
  type FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { startOfLocalDayInstant } from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import {
  ReviewLog,
  StudySession,
  User,
  UserWordProgress,
  Word,
} from '../../database/entities';
import { ReviewType, SrsState } from '../../database/enums';
import { insertIfAbsent } from '../../database/repository.util';
import { AppEvent, type WordReviewedPayload } from '../../events/events';
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
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(UserWordProgress)
    private readonly progress: Repository<UserWordProgress>,
    @InjectRepository(ReviewLog)
    private readonly reviewLogs: Repository<ReviewLog>,
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
      this.userWithSettings(userId),
      this.words.findOneBy({ id: dto.wordId }),
    ]);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    const settings = user.settings;
    const schedulerName = settings?.srsScheduler ?? 'sm2';
    const targetRetention = settings?.targetRetention ?? 0.9;
    const now = new Date();

    const existing = await this.progress.findOneBy({
      userId,
      wordId: dto.wordId,
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

    // Lưu tiến độ mới + 1 dòng nhật ký ôn (+ cộng vào buổi học) trong cùng 1 transaction.
    const progress = await this.dataSource.transaction(async (db) => {
      await db.upsert(
        UserWordProgress,
        {
          userId,
          wordId: dto.wordId,
          ...progressData,
          // Mốc "đã thuộc" ghi 1 lần: lần đầu đạt chu kỳ của từ đã thuộc.
          learnedAt: existing?.learnedAt ?? (nowLearned ? now : null),
        },
        ['userId', 'wordId'],
      );
      const saved = await db.findOneByOrFail(UserWordProgress, {
        userId,
        wordId: dto.wordId,
      });

      await db.insert(ReviewLog, {
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
      });

      if (dto.studySessionId) {
        await db
          .createQueryBuilder()
          .update(StudySession)
          .set({
            cardsReviewed: () => '"cardsReviewed" + 1',
            cardsCorrect: () => `"cardsCorrect" + ${out.isCorrect ? 1 : 0}`,
            newCards: () =>
              `"newCards" + ${reviewType === ReviewType.LEARN ? 1 : 0}`,
          })
          .where({ id: dto.studySessionId, userId, endedAt: IsNull() })
          .execute();
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
    const word = await this.words.findOneBy({ id: wordId });
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    if (await this.progress.existsBy({ userId, wordId }))
      return { added: false };

    await this.progress.insert({
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
    });
    return { added: true };
  }

  // ---------- hàng đợi ôn ----------

  async getQueue(userId: string, query: QueueQueryDto) {
    const user = await this.userWithSettings(userId);
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
    const dueWhere: FindOptionsWhere<UserWordProgress> = {
      userId,
      isSuspended: false,
      state: In(ACTIVE_STATES),
      dueAt: LessThanOrEqual(now),
      ...wordScope,
    };

    const [newDoneToday, reviewsDoneToday, dueCount] = await Promise.all([
      this.reviewLogs.countBy({
        userId,
        reviewType: 'LEARN',
        reviewedAt: MoreThanOrEqual(dayStart),
      }),
      this.reviewLogs.countBy({
        userId,
        reviewedAt: MoreThanOrEqual(dayStart),
      }),
      this.progress.count({ where: dueWhere }),
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
        ? await this.progress.find({
            where: dueWhere,
            relations: { word: true },
            order: { dueAt: 'ASC', easeFactor: 'ASC' },
            take: dueTake,
          })
        : [];

    // Ôn tự do (không bài, không cấp) CHỈ ôn từ đã học — không lấy từ mới.
    // Trước đây rơi về lấy từ mới trên CẢ 9 cấp sắp theo tần suất, nên người
    // mới mở flashcard gặp ngay 著名 (HSK4), 显著 (HSK6)... không theo cấp lẫn
    // chủ đề (lỗi thật user báo). Từ mới giờ chỉ đến từ bài học trong lộ trình.
    const newRemaining = byLesson
      ? 25
      : query.level
        ? Math.max(0, newPerDay - newDoneToday)
        : 0;
    const newRows =
      newRemaining > 0 ? await this.newWords(userId, query, newRemaining) : [];

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

  /** Từ MỚI (người này chưa có dòng tiến độ nào) của 1 bài hoặc 1 cấp. */
  private newWords(userId: string, query: QueueQueryDto, take: number) {
    const qb = this.words
      .createQueryBuilder('word')
      .where(
        'NOT EXISTS (SELECT 1 FROM "UserWordProgress" p WHERE p."wordId" = word.id AND p."userId" = :userId)',
        { userId },
      )
      .take(take);
    if (query.lessonId)
      return qb
        .andWhere('word.lessonId = :lessonId', { lessonId: query.lessonId })
        .orderBy('word.lessonOrder', 'ASC')
        .getMany();
    if (query.level)
      qb.andWhere('word.hskLevel = :level', { level: query.level });
    return qb
      .orderBy('word.frequencyRank', 'ASC')
      .addOrderBy('word.simplified', 'ASC')
      .getMany();
  }

  private userWithSettings(userId: string) {
    return this.users.findOne({
      where: { id: userId },
      relations: { settings: true },
    });
  }

  async getStats(userId: string) {
    const user = await this.userWithSettings(userId);
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
      this.progress.countBy({
        userId,
        isSuspended: false,
        state: In(ACTIVE_STATES),
        dueAt: LessThanOrEqual(now),
      }),
      this.progress.countBy({
        userId,
        isSuspended: false,
        state: In(ACTIVE_STATES),
        dueAt: And(MoreThan(now), LessThanOrEqual(soon)),
      }),
      this.progress.countBy({ userId, learnedAt: Not(IsNull()) }),
      // Từ đang ẩn KHÔNG tính vào "vốn từ đang học": ẩn 1 từ chưa từng học
      // cũng tạo ra 1 dòng tiến độ (xem setSuspended), không trừ ra thì con
      // số này tăng mà người dùng chẳng học thêm gì.
      this.progress.countBy({ userId, isSuspended: false }),
      this.reviewLogs.countBy({
        userId,
        reviewedAt: MoreThanOrEqual(dayStart),
      }),
      this.reviewLogs.countBy({
        userId,
        reviewType: 'LEARN',
        reviewedAt: MoreThanOrEqual(dayStart),
      }),
      this.progress.countBy({ userId, isLeech: true }),
      this.progress.countBy({ userId, isSuspended: true }),
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
   * Từ CHƯA từng học thì tạo sẵn một dòng tiến độ đang ẩn: `getQueue()` chỉ lấy
   * từ mới CHƯA có dòng tiến độ nào (`newWords`), nên chỉ cần TỒN TẠI dòng là
   * từ đó không vào hàng đợi nữa.
   *
   * CỐ Ý KHÔNG đánh dấu `learnedAt` cho từ bị ẩn dù người dùng nói "đã biết":
   * "từ đã thuộc" là một tiêu chí BẢNG XẾP HẠNG, cho tự khai là mở đường
   * gian lận. Ẩn chỉ có nghĩa "đừng hỏi tôi nữa", không phải "tôi đã thuộc".
   */
  async setSuspended(userId: string, wordId: string, suspended: boolean) {
    const word = await this.words.findOneBy({ id: wordId });
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    // Chưa có tiến độ thì tạo dòng mới (đang ẩn), có rồi thì chỉ đổi cờ ẩn.
    const created = await insertIfAbsent(this.progress, {
      userId,
      wordId,
      hskLevel: word.hskLevel,
      state: SrsState.NEW,
      isSuspended: suspended,
      dueAt: null,
    });
    if (!created)
      await this.progress.update(
        { userId, wordId },
        { isSuspended: suspended },
      );
    return { wordId, suspended };
  }

  /** Danh sách từ đang ẩn — để người dùng bỏ ẩn khi đổi ý. */
  async getSuspended(userId: string) {
    const rows = await this.progress.find({
      where: { userId, isSuspended: true },
      order: { updatedAt: 'DESC' },
      relations: { word: true },
      select: {
        id: true,
        updatedAt: true,
        word: {
          id: true,
          simplified: true,
          pinyin: true,
          meaningVi: true,
          hanViet: true,
          hskLevel: true,
          audioUrl: true,
        },
      },
    });
    return rows.map((r) => ({ word: r.word, hiddenAt: r.updatedAt }));
  }

  async getLeeches(userId: string) {
    // Trả NGUYÊN `word` (không `select` bớt như trước): danh sách này giờ
    // còn dùng để mở thẳng một buổi ôn riêng từ khó ở `/study?leeches=1`,
    // mà thẻ flashcard cần đủ field (`pos`, ví dụ...) giống hàng đợi thường.
    const rows = await this.progress.find({
      where: { userId, isLeech: true },
      relations: { word: { examples: true } },
      order: { lapses: 'DESC', word: { examples: { orderIndex: 'ASC' } } },
    });
    return rows.map((r) => ({
      word: r.word,
      lapses: r.lapses,
      dueAt: r.dueAt,
    }));
  }
}

export type { UserWordProgress };
