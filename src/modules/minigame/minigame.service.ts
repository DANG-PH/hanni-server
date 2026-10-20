import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, IsNull, Not, Repository } from 'typeorm';
import { notTestAccount } from '../../common/test-accounts';
import {
  MinigameSession,
  User,
  UserWordProgress,
  Word,
} from '../../database/entities';
import { GameMode } from '../../database/enums';
import { RedisService } from '../../infra/redis/redis.service';
import { applyPremiumMultiplier } from '../premium/premium-plans';
import { WalletService } from '../wallet/wallet.service';
import type { FinishMinigameDto } from './dto/minigame.dto';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QUESTION_COUNT = 30;
const POOL_SIZE = 800;
const MATCH_PAIRS = 8;
/** Thời gian tối thiểu hợp lý để lật xong `MATCH_PAIRS` cặp thẻ — chặn báo
 * điểm gian dối kiểu "hoàn thành trong 0 giây" (không thể xác minh chi
 * tiết từng lượt lật như MC vì việc so khớp đã lộ hết ở phía client ngay
 * lúc tải dữ liệu, nhưng vẫn chặn được trường hợp lộ liễu nhất). */
const MATCH_MIN_MS_PER_PAIR = 500;
/** Lượt chơi của KHÁCH giữ tạm trong Redis — đủ cho 1 ván 60 giây lẫn ván ghép cặp. */
const GUEST_TTL_SEC = 30 * 60;
const guestKey = (sessionId: string) => `minigame:guest:${sessionId}`;

interface StoredQuestion {
  wordId: string;
  prompt: string;
  pinyin: string;
  audioUrl: string | null;
  options: string[];
  correctIndex: number;
}

export interface MatchCard {
  cardId: string;
  wordId: string;
  kind: 'hanzi' | 'meaning';
  content: string;
}

interface GuestSession {
  mode: GameMode;
  questions: StoredQuestion[] | MatchCard[];
}

/** Đếm câu đúng bằng đáp án đã lưu lúc bắt đầu (không tin điểm client báo). */
function gradeAnswers(
  questions: StoredQuestion[],
  answers: NonNullable<FinishMinigameDto['answers']>,
): number {
  const byWordId = new Map(questions.map((q) => [q.wordId, q]));
  let score = 0;
  for (const a of answers) {
    const q = byWordId.get(a.wordId);
    if (q && q.correctIndex === a.chosenIndex) score += 1;
  }
  return score;
}

/** Ghép cặp: số cặp trừ số lần lật sai, tối thiểu 1 nếu hoàn thành hợp lệ. */
function matchScore(dto: FinishMinigameDto): number {
  const mistakes = Math.max(0, dto.mistakes ?? 0);
  const plausible = dto.durationMs >= MATCH_PAIRS * MATCH_MIN_MS_PER_PAIR;
  return plausible ? Math.max(1, MATCH_PAIRS - mistakes) : 0;
}

/**
 * 4 minigame — "Dịch tốc độ" (TRANSLATE), "Nghe đoán từ" (LISTENING),
 * "Ghép cặp" (MATCH), "Chọn pinyin đúng" (PINYIN) — Giai đoạn 1 theo lộ
 * trình trong FEATURES.md: chơi 1 mình, tính giờ, có bảng xếp hạng
 * ngày/tuần RIÊNG theo từng mode.
 *
 * TRANSLATE/LISTENING/PINYIN dùng CHUNG engine trắc nghiệm (đáp án đúng là
 * `meaningVi` cho 2 mode đầu, `pinyin` cho PINYIN — xem `answerOf()`), chỉ
 * khác nguồn từ (LISTENING bắt buộc có `audioUrl`) và việc client có ẩn Hán
 * tự/pinyin hay không (server luôn trả đủ Hán tự + pinyin + audio cho MỌI
 * mode, FE tự quyết định ẩn/hiện — y hệt cách `QuizService`/`quiz-runner.tsx`
 * đã làm cho câu nghe). Khác `QuizService` (tin thẳng `isCorrect` client tự
 * báo): ở đây server LƯU SẴN đáp án đúng lúc bắt đầu
 * (`MinigameSession.questions`), và tự so khớp lúc nộp bài — cần thiết vì
 * kết quả game này quy đổi ra xu thật.
 *
 * MATCH (lật thẻ tìm cặp) khác hẳn các mode trên — không có "đáp án bí mật"
 * để giấu (việc so khớp 2 thẻ vốn công khai ngay khi tải dữ liệu, bản chất
 * trò chơi trí nhớ), nên `finish()` chỉ chặn được báo cáo gian dối LỘ LIỄU
 * nhất (thời gian hoàn thành nhanh hơn mức vật lý có thể), xem
 * `finishMatchGame()`.
 */
@Injectable()
export class MinigameService {
  constructor(
    @InjectRepository(MinigameSession)
    private readonly sessions: Repository<MinigameSession>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(UserWordProgress)
    private readonly progress: Repository<UserWordProgress>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly wallet: WalletService,
    private readonly redis: RedisService,
  ) {}

  /** Khách (`userId` null) chơi được như người đã đăng nhập — lượt chơi giữ tạm
   * trong Redis vì `MinigameSession` bắt buộc có người chơi; không có xu, không
   * lên bảng xếp hạng. */
  private async saveSession(
    userId: string | null,
    mode: GameMode,
    questions: StoredQuestion[] | MatchCard[],
  ): Promise<string> {
    if (!userId) {
      const id = randomUUID();
      await this.redis.setJson(
        guestKey(id),
        { mode, questions } satisfies GuestSession,
        GUEST_TTL_SEC,
      );
      return id;
    }
    const { identifiers } = await this.sessions.insert({
      userId,
      mode,
      questions,
    });
    return identifiers[0].id as string;
  }

  /** Kho từ cho 1 ván — ƯU TIÊN từ chính người chơi ĐANG HỌC, thiếu thì bù
   * bằng từ phổ biến.
   *
   * Trước đây luôn lấy `POOL_SIZE` từ phổ biến nhất TOÀN BỘ kho, bất kể
   * người chơi đang ở đâu — nên người học HSK5 vẫn chơi với từ HSK1 và
   * minigame chẳng liên quan gì tới việc học của họ. Cố tình KHÔNG bó vào
   * đúng 1 bài học như `/listening`/`/writing`: minigame là luyện PHẢN XẠ
   * trên vốn từ rộng, bó vào 10-15 từ một bài thì lặp lại rất nhanh và chán.
   * Cùng cách `QuizService` đã làm. */
  private async buildPool(userId: string | null, mode: GameMode) {
    const needsAudio = mode === GameMode.LISTENING;
    const wordWhere = {
      meaningVi: Not(IsNull()),
      ...(needsAudio ? { audioUrl: Not(IsNull()) } : {}),
    };

    const learning = userId
      ? await this.progress.find({
          where: { userId, word: wordWhere },
          relations: { word: true },
          order: { updatedAt: 'DESC' },
          take: POOL_SIZE,
        })
      : [];
    const pool = learning.map((p) => p.word);
    if (pool.length >= POOL_SIZE) return pool;

    // Bù từ phổ biến (bỏ những từ đã có để không trùng đáp án).
    const extra = await this.words.find({
      where: { ...wordWhere, id: Not(In(pool.map((w) => w.id))) },
      order: { frequencyRank: 'ASC' },
      take: POOL_SIZE - pool.length,
    });
    return [...pool, ...extra];
  }

  async start(userId: string | null, mode: GameMode = GameMode.TRANSLATE) {
    if (mode === GameMode.MATCH) return this.startMatchGame(userId);

    const pool = await this.buildPool(userId, mode);
    if (pool.length < 4) {
      throw new BadRequestException('Chưa đủ từ vựng để chơi minigame');
    }

    const picked = shuffle(pool).slice(
      0,
      Math.min(QUESTION_COUNT, pool.length),
    );
    // PINYIN: đáp án đúng là pinyin thay vì nghĩa tiếng Việt — dùng chung
    // hết phần còn lại của engine (trộn đáp án, tính điểm...).
    const answerOf = (w: (typeof pool)[number]) =>
      mode === GameMode.PINYIN ? w.pinyin : w.meaningVi!;
    const allAnswers = pool.map(answerOf).filter(Boolean);

    const questions: StoredQuestion[] = picked.map((w) => {
      const answer = answerOf(w);
      const distractors = shuffle(allAnswers.filter((a) => a !== answer)).slice(
        0,
        3,
      );
      const options = shuffle([answer, ...distractors]);
      return {
        wordId: w.id,
        prompt: w.simplified,
        pinyin: w.pinyin,
        audioUrl: w.audioUrl,
        options,
        correctIndex: options.indexOf(answer),
      };
    });

    const sessionId = await this.saveSession(userId, mode, questions);

    return {
      sessionId,
      mode,
      questions: questions.map((q) => ({
        wordId: q.wordId,
        prompt: q.prompt,
        pinyin: q.pinyin,
        audioUrl: q.audioUrl,
        options: q.options,
      })),
    };
  }

  /** "Ghép cặp": chọn `MATCH_PAIRS` từ, tạo 2 thẻ/từ (mặt Hán tự + mặt
   * nghĩa), trộn vị trí rồi trả về NGUYÊN mảng thẻ (kèm `wordId`) — khác
   * TRANSLATE/LISTENING, ở đây không giấu được "đáp án" vì việc so khớp 2
   * thẻ vốn công khai ngay khi tải dữ liệu (bản chất trò lật thẻ trí nhớ),
   * nên không cần giấu `wordId` như giấu `correctIndex` ở 2 mode kia. */
  private async startMatchGame(userId: string | null) {
    const pool = await this.words.find({
      where: { meaningVi: Not(IsNull()) },
      order: { frequencyRank: 'ASC' },
      take: POOL_SIZE,
    });
    if (pool.length < MATCH_PAIRS) {
      throw new BadRequestException('Chưa đủ từ vựng để chơi minigame');
    }
    const picked = shuffle(pool).slice(0, MATCH_PAIRS);
    const cards: MatchCard[] = shuffle(
      picked.flatMap((w, i) => [
        {
          cardId: `${i}-h`,
          wordId: w.id,
          kind: 'hanzi' as const,
          content: w.simplified,
        },
        {
          cardId: `${i}-m`,
          wordId: w.id,
          kind: 'meaning' as const,
          content: w.meaningVi!,
        },
      ]),
    );

    const sessionId = await this.saveSession(userId, GameMode.MATCH, cards);

    return { sessionId, mode: GameMode.MATCH, cards };
  }

  async finish(
    userId: string | null,
    sessionId: string,
    dto: FinishMinigameDto,
  ) {
    if (!userId) return this.finishGuest(sessionId, dto);
    const session = await this.sessions.findOneBy({ id: sessionId });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy lượt chơi');
    }
    if (session.finishedAt) {
      throw new BadRequestException('Lượt chơi này đã kết thúc rồi');
    }

    if (session.mode === GameMode.MATCH) {
      return this.finishMatchGame(userId, sessionId, dto);
    }

    const answers = dto.answers ?? [];
    const score = gradeAnswers(session.questions as StoredQuestion[], answers);

    await this.sessions.update(sessionId, {
      score,
      totalAsked: answers.length,
      durationMs: dto.durationMs,
      finishedAt: new Date(),
    });

    // 1 xu / câu đúng — đơn giản, minh bạch cho giai đoạn kiểm chứng gameplay.
    const { coinsEarned, balance } = await this.creditMinigameReward(
      userId,
      score,
    );

    return {
      score,
      totalAsked: answers.length,
      coinsEarned,
      balance,
    };
  }

  /** Khách: chấm giống hệt người đã đăng nhập (đáp án lấy từ Redis, đọc 1 lần
   * rồi xoá) nhưng không cộng xu, không lưu điểm. */
  private async finishGuest(sessionId: string, dto: FinishMinigameDto) {
    const session = await this.redis.takeJson<GuestSession>(
      guestKey(sessionId),
    );
    if (!session) throw new NotFoundException('Không tìm thấy lượt chơi');
    if (session.mode === GameMode.MATCH) {
      return {
        score: matchScore(dto),
        totalAsked: MATCH_PAIRS,
        coinsEarned: 0,
        balance: null,
      };
    }
    const answers = dto.answers ?? [];
    return {
      score: gradeAnswers(session.questions as StoredQuestion[], answers),
      totalAsked: answers.length,
      coinsEarned: 0,
      balance: null,
    };
  }

  /** Premium nhân đôi xu kiếm được từ minigame (xem `PREMIUM_XU_MULTIPLIER`
   * ở premium-plans.ts) — dùng chung cho cả trắc nghiệm lẫn "Ghép cặp". */
  private async creditMinigameReward(
    userId: string,
    score: number,
  ): Promise<{ coinsEarned: number; balance: number }> {
    const user = await this.users.findOneOrFail({
      where: { id: userId },
      select: { id: true, premiumUntil: true },
    });
    const coinsEarned = applyPremiumMultiplier(score, user.premiumUntil);
    const balance = await this.wallet.credit(userId, coinsEarned, 'minigame');
    return { coinsEarned, balance };
  }

  /** "Ghép cặp": không có gì bí mật để so khớp lại (khác trắc nghiệm — xem
   * ghi chú ở `startMatchGame`), chỉ chặn báo cáo gian dối lộ liễu nhất
   * (hoàn thành nhanh hơn mức vật lý có thể) bằng `MATCH_MIN_MS_PER_PAIR`.
   * Điểm = số cặp trừ đi số lần lật sai, tối thiểu 1 nếu hoàn thành. */
  private async finishMatchGame(
    userId: string,
    sessionId: string,
    dto: FinishMinigameDto,
  ) {
    const score = matchScore(dto);

    await this.sessions.update(sessionId, {
      score,
      totalAsked: MATCH_PAIRS,
      durationMs: dto.durationMs,
      finishedAt: new Date(),
    });

    const { coinsEarned, balance } = await this.creditMinigameReward(
      userId,
      score,
    );

    return {
      score,
      totalAsked: MATCH_PAIRS,
      coinsEarned,
      balance,
    };
  }

  async leaderboard(
    period: 'daily' | 'weekly' = 'daily',
    mode: GameMode = GameMode.TRANSLATE,
  ) {
    const now = new Date();
    const since =
      period === 'weekly'
        ? new Date(now.getTime() - 7 * 86_400_000)
        : new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
          );

    // Xếp hạng riêng theo TỪNG mode — ghép cả 2 vào 1 bảng sẽ không công
    // bằng vì độ khó (số từ có audio ít hơn số từ có nghĩa) khác nhau.
    const rows = await this.sessions
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.user', 'u')
      .where('s.finishedAt >= :since', { since })
      .andWhere('s.mode = :mode', { mode })
      .andWhere(notTestAccount('u'))
      .orderBy('s.score', 'DESC')
      .addOrderBy('s.durationMs', 'ASC')
      .take(20)
      .getMany();

    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user.id,
      displayName: r.user.displayName,
      avatarUrl: r.user.avatarUrl,
      score: r.score ?? 0,
      totalAsked: r.totalAsked ?? 0,
      durationMs: r.durationMs ?? 0,
    }));
  }
}
