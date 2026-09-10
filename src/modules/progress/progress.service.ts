import { Injectable, NotFoundException } from '@nestjs/common';
import { SrsState } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

const LEARNED_INTERVAL_DAYS = 21;

export interface LevelBucket {
  level: number;
  band: string;
  nameVi: string;
  totalWords: number;
  learned: number;
  learning: number;
  due: number;
  atRisk: number;
  notStarted: number;
  percentComplete: number;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tổng quan tiến độ theo từng cấp HSK (tính trực tiếp — nguồn sự thật). */
  async overview(userId: string): Promise<{
    levels: LevelBucket[];
    totals: Omit<LevelBucket, 'level' | 'band' | 'nameVi'>;
  }> {
    const now = Date.now();
    const soon = new Date(now + 24 * 60 * 60 * 1000);

    const [levels, wordCounts, rows] = await Promise.all([
      this.prisma.hskLevel.findMany({ orderBy: { level: 'asc' } }),
      this.prisma.word.groupBy({ by: ['hskLevel'], _count: { _all: true } }),
      this.prisma.userWordProgress.findMany({
        where: { userId },
        select: {
          hskLevel: true,
          state: true,
          learnedAt: true,
          dueAt: true,
          intervalDays: true,
          isSuspended: true,
        },
      }),
    ]);

    const totalByLevel = new Map(
      wordCounts.map((c) => [c.hskLevel, c._count._all]),
    );

    const buckets: LevelBucket[] = levels.map((lv) => {
      const mine = rows.filter((r) => r.hskLevel === lv.level);
      const totalWords = totalByLevel.get(lv.level) ?? 0;
      let learned = 0;
      let learning = 0;
      let due = 0;
      let atRisk = 0;
      for (const r of mine) {
        const isLearned =
          r.learnedAt != null ||
          (r.state === SrsState.REVIEW &&
            r.intervalDays >= LEARNED_INTERVAL_DAYS);
        if (isLearned) learned += 1;
        else if (r.state !== SrsState.NEW) learning += 1;

        if (!r.isSuspended && r.state !== SrsState.NEW && r.dueAt) {
          if (r.dueAt.getTime() <= now) due += 1;
          else if (r.dueAt <= soon) atRisk += 1;
        }
      }
      const notStarted = Math.max(0, totalWords - mine.length);
      return {
        level: lv.level,
        band: lv.band,
        nameVi: lv.nameVi,
        totalWords,
        learned,
        learning,
        due,
        atRisk,
        notStarted,
        percentComplete:
          totalWords > 0 ? Math.round((learned / totalWords) * 1000) / 10 : 0,
      };
    });

    const totals = buckets.reduce(
      (acc, b) => ({
        totalWords: acc.totalWords + b.totalWords,
        learned: acc.learned + b.learned,
        learning: acc.learning + b.learning,
        due: acc.due + b.due,
        atRisk: acc.atRisk + b.atRisk,
        notStarted: acc.notStarted + b.notStarted,
        percentComplete: 0,
      }),
      {
        totalWords: 0,
        learned: 0,
        learning: 0,
        due: 0,
        atRisk: 0,
        notStarted: 0,
        percentComplete: 0,
      },
    );
    totals.percentComplete =
      totals.totalWords > 0
        ? Math.round((totals.learned / totals.totalWords) * 1000) / 10
        : 0;

    return { levels: buckets, totals };
  }

  async levelDetail(userId: string, level: number) {
    const info = await this.prisma.hskLevel.findUnique({ where: { level } });
    if (!info) throw new NotFoundException('Cấp HSK không hợp lệ');
    const { levels } = await this.overview(userId);
    const bucket = levels.find((l) => l.level === level);
    return { ...info, progress: bucket };
  }

  /** Cập nhật cache UserLevelProgress cho 1 cấp sau khi user review. */
  async recomputeLevelCache(
    userId: string,
    level: number,
  ): Promise<{ justCompleted: boolean }> {
    const now = new Date();
    const [totalWords, mine] = await Promise.all([
      this.prisma.word.count({ where: { hskLevel: level } }),
      this.prisma.userWordProgress.findMany({
        where: { userId, hskLevel: level },
        select: {
          state: true,
          learnedAt: true,
          dueAt: true,
          intervalDays: true,
          isSuspended: true,
        },
      }),
    ]);

    let learnedWords = 0;
    let reviewingWords = 0;
    let dueWords = 0;
    let atRiskWords = 0;
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    for (const r of mine) {
      const isLearned =
        r.learnedAt != null ||
        (r.state === SrsState.REVIEW && r.intervalDays >= LEARNED_INTERVAL_DAYS);
      if (isLearned) learnedWords += 1;
      else if (r.state !== SrsState.NEW) reviewingWords += 1;
      if (!r.isSuspended && r.state !== SrsState.NEW && r.dueAt) {
        if (r.dueAt <= now) dueWords += 1;
        else if (r.dueAt <= soon) atRiskWords += 1;
      }
    }

    const isComplete = totalWords > 0 && learnedWords >= totalWords;
    const prev = await this.prisma.userLevelProgress.findUnique({
      where: { userId_hskLevel: { userId, hskLevel: level } },
    });

    await this.prisma.userLevelProgress.upsert({
      where: { userId_hskLevel: { userId, hskLevel: level } },
      create: {
        userId,
        hskLevel: level,
        totalWords,
        learnedWords,
        reviewingWords,
        dueWords,
        atRiskWords,
        completedAt: isComplete ? now : null,
      },
      update: {
        totalWords,
        learnedWords,
        reviewingWords,
        dueWords,
        atRiskWords,
        completedAt: isComplete ? (prev?.completedAt ?? now) : null,
      },
    });

    return { justCompleted: isComplete && !prev?.completedAt };
  }
}
