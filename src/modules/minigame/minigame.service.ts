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

interface StoredQuestion {
  wordId: string;
  prompt: string;
  pinyin: string;
  audioUrl: string | null;
  options: string[];
  correctIndex: number;
}

/**
 * Minigame "Dịch tốc độ" (TRANSLATE) + "Nghe đoán từ" (LISTENING) — Giai
 * đoạn 1 theo lộ trình trong FEATURES.md: chơi 1 mình, tính giờ, có bảng
 * xếp hạng ngày/tuần. 2 chế độ dùng CHUNG engine, chỉ khác nguồn từ (LISTENING
 * bắt buộc có `audioUrl`) và việc client có ẩn Hán tự/pinyin hay không (server
 * luôn trả đủ cả 2 trường, FE tự quyết định ẩn/hiện theo mode — y hệt cách
 * `QuizService`/`quiz-runner.tsx` đã làm cho câu nghe).
 *
 * Khác `QuizService` (tin thẳng `isCorrect` client tự báo): ở đây server
 * LƯU SẴN đáp án đúng lúc bắt đầu (`MinigameSession.questions`), và tự so
 * khớp lúc nộp bài — cần thiết vì kết quả game này quy đổi ra xu thật.
 */
@Injectable()
export class MinigameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async start(userId: string, mode: GameMode = GameMode.TRANSLATE) {
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

    const questions = session.questions as unknown as StoredQuestion[];
    const byWordId = new Map(questions.map((q) => [q.wordId, q]));
    let score = 0;
    for (const a of dto.answers) {
      const q = byWordId.get(a.wordId);
      if (q && q.correctIndex === a.chosenIndex) score += 1;
    }

    await this.prisma.minigameSession.update({
      where: { id: sessionId },
      data: {
        score,
        totalAsked: dto.answers.length,
        durationMs: dto.durationMs,
        finishedAt: new Date(),
      },
    });

    // 1 xu / câu đúng — đơn giản, minh bạch cho giai đoạn kiểm chứng gameplay.
    const balance = await this.wallet.credit(userId, score, 'minigame');

    return {
      score,
      totalAsked: dto.answers.length,
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
