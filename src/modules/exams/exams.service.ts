import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface SaveAttempt {
  hskLevel: number;
  totalCount: number;
  correctCount: number;
  durationSec?: number;
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, dto: SaveAttempt) {
    const correct = Math.min(dto.correctCount, dto.totalCount);
    const attempt = await this.prisma.examAttempt.create({
      data: {
        userId,
        hskLevel: dto.hskLevel,
        totalCount: dto.totalCount,
        correctCount: correct,
        durationSec: dto.durationSec ?? null,
      },
      select: { id: true, createdAt: true },
    });
    return attempt;
  }

  /** Lịch sử làm bài gần đây + tóm tắt. */
  async history(userId: string, limit = 20) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        hskLevel: true,
        totalCount: true,
        correctCount: true,
        durationSec: true,
        createdAt: true,
      },
    });
    const agg = await this.prisma.examAttempt.aggregate({
      where: { userId },
      _count: { _all: true },
      _avg: { correctCount: true, totalCount: true },
    });
    const best = await this.prisma.examAttempt.findFirst({
      where: { userId },
      orderBy: [{ correctCount: 'desc' }, { totalCount: 'asc' }],
      select: { hskLevel: true, correctCount: true, totalCount: true },
    });
    return {
      attempts,
      summary: {
        count: agg._count._all,
        avgAccuracy:
          agg._avg.totalCount && agg._avg.correctCount
            ? Math.round((agg._avg.correctCount / agg._avg.totalCount) * 100)
            : null,
        best,
      },
    };
  }
}
