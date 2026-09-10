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
      out.state === SrsState.REVIEW && out.intervalDays >= LEARNED_INTERVAL_DAYS;

    const progressData = {
      hskLevel: word.hskLevel,
      state: out.state,
      dueAt: out.dueAt,
      lastReviewedAt: now,
      reps: out.reps,
      lapses: out.lapses,
      lastRating: dto.rating,
      isLeech: out.lapses >= LEECH_LAPSES,
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

  // ---------- hàng đợi ôn ----------

  async getQueue(userId: string, query: QueueQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const now = new Date();
    const dayStart = startOfLocalDayInstant(now, user.timezone, this.cutoffHour);
    const limit = query.limit ?? 60;
    const newPerDay = user.settings?.newCardsPerDay ?? 10;

    const levelFilter = query.level ? { hskLevel: query.level } : {};
    const dueWhere: Prisma.UserWordProgressWhereInput = {
      userId,
      isSuspended: false,
      state: { in: ACTIVE_STATES },
      dueAt: { lte: now },
      ...levelFilter,
    };

    const [newDoneToday, reviewsDoneToday, dueCount, dueRows] = await Promise.all([
      this.prisma.reviewLog.count({
        where: { userId, reviewType: 'LEARN', reviewedAt: { gte: dayStart } },
      }),
      this.prisma.reviewLog.count({
        where: { userId, reviewedAt: { gte: dayStart } },
      }),
      this.prisma.userWordProgress.count({ where: dueWhere }),
      this.prisma.userWordProgress.findMany({
        where: dueWhere,
        include: { word: true },
        orderBy: [{ dueAt: 'asc' }, { easeFactor: 'asc' }],
        take: limit,
      }),
    ]);

    const newRemaining = Math.max(0, newPerDay - newDoneToday);
    const newRows =
      newRemaining > 0
        ? await this.prisma.word.findMany({
            where: { ...levelFilter, progress: { none: { userId } } },
            orderBy: [{ frequencyRank: 'asc' }, { simplified: 'asc' }],
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
    const dayStart = startOfLocalDayInstant(now, user.timezone, this.cutoffHour);
    const newPerDay = user.settings?.newCardsPerDay ?? 10;

    const [dueNow, learnedTotal, inProgress, reviewsDoneToday, newDoneToday] =
      await Promise.all([
        this.prisma.userWordProgress.count({
          where: {
            userId,
            isSuspended: false,
            state: { in: ACTIVE_STATES },
            dueAt: { lte: now },
          },
        }),
        this.prisma.userWordProgress.count({
          where: { userId, learnedAt: { not: null } },
        }),
        this.prisma.userWordProgress.count({ where: { userId } }),
        this.prisma.reviewLog.count({
          where: { userId, reviewedAt: { gte: dayStart } },
        }),
        this.prisma.reviewLog.count({
          where: { userId, reviewType: 'LEARN', reviewedAt: { gte: dayStart } },
        }),
      ]);

    return {
      dueNow,
      learnedTotal,
      inProgress,
      reviewsDoneToday,
      newDoneToday,
      newRemaining: Math.max(0, newPerDay - newDoneToday),
    };
  }
}

export type { UserWordProgress };
