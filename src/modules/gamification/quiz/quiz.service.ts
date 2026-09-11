import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Word } from '@prisma/client';
import { AppEvent, type QuizCompletedPayload } from '../../../events/events';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { GenerateQuizDto, SubmitQuizDto } from './dto/quiz.dto';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface QuizQuestion {
  wordId: string;
  prompt: string; // Hán tự
  pinyin: string;
  options: string[]; // 4 nghĩa tiếng Việt
  answer: string; // nghĩa đúng
}

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Sinh 1 bài quiz trắc nghiệm nhanh (Hán tự → nghĩa tiếng Việt). */
  async generate(userId: string, dto: GenerateQuizDto) {
    const size = dto.size ?? 10;

    let pool: Word[];
    if (dto.wordIds?.length) {
      pool = await this.prisma.word.findMany({
        where: { id: { in: dto.wordIds }, meaningVi: { not: null } },
      });
    } else {
      // ưu tiên từ user đang học ở cấp yêu cầu
      const progress = await this.prisma.userWordProgress.findMany({
        where: {
          userId,
          ...(dto.level ? { hskLevel: dto.level } : {}),
          word: { meaningVi: { not: null } },
        },
        include: { word: true },
        take: 200,
      });
      pool = progress.map((p) => p.word);
      if (pool.length < size) {
        const extra = await this.prisma.word.findMany({
          where: {
            ...(dto.level ? { hskLevel: dto.level } : {}),
            meaningVi: { not: null },
          },
          orderBy: { frequencyRank: 'asc' },
          take: size * 4,
        });
        pool = [...pool, ...extra];
      }
    }

    const uniq = new Map(pool.map((w) => [w.id, w]));
    pool = [...uniq.values()];
    if (pool.length < 4) {
      throw new BadRequestException(
        'Chưa đủ từ có nghĩa tiếng Việt để tạo quiz',
      );
    }

    const picked = shuffle(pool).slice(0, Math.min(size, pool.length));
    const allMeanings = pool.map((w) => w.meaningVi!).filter(Boolean);

    const questions: QuizQuestion[] = picked.map((w) => {
      const distractors = shuffle(
        allMeanings.filter((m) => m !== w.meaningVi),
      ).slice(0, 3);
      return {
        wordId: w.id,
        prompt: w.simplified,
        pinyin: w.pinyin,
        options: shuffle([w.meaningVi!, ...distractors]),
        answer: w.meaningVi!,
      };
    });

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        totalQuestions: questions.length,
        format: { type: 'hanzi_to_vi' },
      },
    });

    return { attemptId: attempt.id, questions };
  }

  async submit(userId: string, dto: SubmitQuizDto) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: dto.attemptId },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Không tìm thấy bài quiz');
    }
    if (attempt.completedAt) return attempt;

    const correctCount = dto.answers.filter((a) => a.isCorrect).length;
    const total = dto.answers.length || attempt.totalQuestions || 1;
    const scorePct = Math.round((correctCount / total) * 1000) / 10;

    const [updated] = await this.prisma.$transaction([
      this.prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          completedAt: new Date(),
          totalQuestions: dto.answers.length || attempt.totalQuestions,
          correctCount,
          scorePct,
        },
      }),
      this.prisma.quizAnswer.createMany({
        data: dto.answers.map((a) => ({
          quizAttemptId: attempt.id,
          wordId: a.wordId,
          isCorrect: a.isCorrect,
          chosen: a.chosen ?? null,
          correct: a.correct ?? null,
          responseMs: a.responseMs ?? null,
        })),
      }),
    ]);

    const payload: QuizCompletedPayload = {
      userId,
      quizAttemptId: attempt.id,
      scorePct,
    };
    this.events.emit(AppEvent.QuizCompleted, payload);

    return updated;
  }

  async recent(userId: string, limit = 10) {
    return this.prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
  }
}
