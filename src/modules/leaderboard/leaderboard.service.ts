import { Injectable } from '@nestjs/common';
import { SrsState } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

const LEARNED_INTERVAL_DAYS = 21;

/** Điều kiện "đã thuộc" — khớp với ProgressService. */
const LEARNED_WHERE = {
  OR: [
    { learnedAt: { not: null } },
    { state: SrsState.REVIEW, intervalDays: { gte: LEARNED_INTERVAL_DAYS } },
  ],
};

export interface Row {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  learnedWords: number;
  currentStreak: number;
  isMe: boolean;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bảng xếp hạng theo số từ đã thuộc. Kèm hạng của chính user. */
  async top(userId: string, limit = 50) {
    const grouped = await this.prisma.userWordProgress.groupBy({
      by: ['userId'],
      where: LEARNED_WHERE,
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
    });

    const myIndex = grouped.findIndex((g) => g.userId === userId);
    const me = {
      rank: myIndex >= 0 ? myIndex + 1 : null,
      learnedWords: myIndex >= 0 ? grouped[myIndex]._count : 0,
      totalRanked: grouped.length,
    };

    const top = grouped.slice(0, limit);
    const ids = top.map((g) => g.userId);
    const [users, streaks] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, displayName: true, avatarUrl: true },
      }),
      this.prisma.userStreak.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, currentStreak: true },
      }),
    ]);
    const uMap = new Map(users.map((u) => [u.id, u]));
    const sMap = new Map(streaks.map((s) => [s.userId, s.currentStreak]));

    const rows: Row[] = top.map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      displayName: uMap.get(g.userId)?.displayName ?? 'Người học ẩn danh',
      avatarUrl: uMap.get(g.userId)?.avatarUrl ?? null,
      learnedWords: g._count,
      currentStreak: sMap.get(g.userId) ?? 0,
      isMe: g.userId === userId,
    }));

    return { rows, me };
  }
}
