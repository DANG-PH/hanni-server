import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameMode, type Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
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

/**
 * 3 minigame — "Dịch tốc độ" (TRANSLATE), "Nghe đoán từ" (LISTENING),
 * "Ghép cặp" (MATCH) — Giai đoạn 1 theo lộ trình trong FEATURES.md: chơi 1
 * mình, tính giờ, có bảng xếp hạng ngày/tuần RIÊNG theo từng mode.
 *
 * TRANSLATE/LISTENING dùng CHUNG engine trắc nghiệm, chỉ khác nguồn từ
 * (LISTENING bắt buộc có `audioUrl`) và việc client có ẩn Hán tự/pinyin hay
 * không (server luôn trả đủ cả 2 trường, FE tự quyết định ẩn/hiện theo
 * mode — y hệt cách `QuizService`/`quiz-runner.tsx` đã làm cho câu nghe).
 * Khác `QuizService` (tin thẳng `isCorrect` client tự báo): ở đây server
 * LƯU SẴN đáp án đúng lúc bắt đầu (`MinigameSession.questions`), và tự so
 * khớp lúc nộp bài — cần thiết vì kết quả game này quy đổi ra xu thật.
 *
 * MATCH (lật thẻ tìm cặp) khác hẳn 2 mode trên — không có "đáp án bí mật"
 * để giấu (việc so khớp 2 thẻ vốn công khai ngay khi tải dữ liệu, bản chất
 * trò chơi trí nhớ), nên `finish()` chỉ chặn được báo cáo gian dối LỘ LIỄU
 * nhất (thời gian hoàn thành nhanh hơn mức vật lý có thể), xem
 * `finishMatchGame()`.
 */
@Injectable()
export class MinigameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async start(userId: string, mode: GameMode = GameMode.TRANSLATE) {
    if (mode === GameMode.MATCH) return this.startMatchGame(userId);

    const pool = await this.prisma.word.findMany({
      where: {
        meaningVi: { not: null },
        ...(mode === GameMode.LISTENING ? { audioUrl: { not: null } } : {}),
      },
      orderBy: { frequencyRank: 'asc' },
      take: POOL_SIZE,
    });
    if (pool.length < 4) {
      throw new BadRequestException('Chưa đủ từ vựng để chơi minigame');
    }

    const picked = shuffle(pool).slice(
      0,
      Math.min(QUESTION_COUNT, pool.length),
    );
    const allMeanings = pool.map((w) => w.meaningVi!).filter(Boolean);

    const questions: StoredQuestion[] = picked.map((w) => {
      const distractors = shuffle(
        allMeanings.filter((m) => m !== w.meaningVi),
      ).slice(0, 3);
      const options = shuffle([w.meaningVi!, ...distractors]);
      return {
        wordId: w.id,
        prompt: w.simplified,
        pinyin: w.pinyin,
        audioUrl: w.audioUrl,
        options,
        correctIndex: options.indexOf(w.meaningVi!),
      };
    });

    const session = await this.prisma.minigameSession.create({
      data: {
        userId,
        mode,
        questions: questions as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      sessionId: session.id,
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
  private async startMatchGame(userId: string) {
    const pool = await this.prisma.word.findMany({
      where: { meaningVi: { not: null } },
      orderBy: { frequencyRank: 'asc' },
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

    const session = await this.prisma.minigameSession.create({
      data: {
        userId,
        mode: GameMode.MATCH,
        questions: cards as unknown as Prisma.InputJsonValue,
      },
    });

    return { sessionId: session.id, mode: GameMode.MATCH, cards };
  }

  async finish(userId: string, sessionId: string, dto: FinishMinigameDto) {
    const session = await this.prisma.minigameSession.findUnique({
      where: { id: sessionId },
    });
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
    const questions = session.questions as unknown as StoredQuestion[];
    const byWordId = new Map(questions.map((q) => [q.wordId, q]));
    let score = 0;
    for (const a of answers) {
      const q = byWordId.get(a.wordId);
      if (q && q.correctIndex === a.chosenIndex) score += 1;
    }

    await this.prisma.minigameSession.update({
      where: { id: sessionId },
      data: {
        score,
        totalAsked: answers.length,
        durationMs: dto.durationMs,
        finishedAt: new Date(),
      },
    });

    // 1 xu / câu đúng — đơn giản, minh bạch cho giai đoạn kiểm chứng gameplay.
    const balance = await this.wallet.credit(userId, score, 'minigame');

    return {
      score,
      totalAsked: answers.length,
      coinsEarned: score,
      balance,
    };
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
    const mistakes = Math.max(0, dto.mistakes ?? 0);
    const plausible = dto.durationMs >= MATCH_PAIRS * MATCH_MIN_MS_PER_PAIR;
    const score = plausible ? Math.max(1, MATCH_PAIRS - mistakes) : 0;

    await this.prisma.minigameSession.update({
      where: { id: sessionId },
      data: {
        score,
        totalAsked: MATCH_PAIRS,
        durationMs: dto.durationMs,
        finishedAt: new Date(),
      },
    });

    const balance = await this.wallet.credit(userId, score, 'minigame');

    return {
      score,
      totalAsked: MATCH_PAIRS,
      coinsEarned: score,
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
    const rows = await this.prisma.minigameSession.findMany({
      where: { finishedAt: { gte: since }, mode },
      orderBy: [{ score: 'desc' }, { durationMs: 'asc' }],
      take: 20,
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

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
