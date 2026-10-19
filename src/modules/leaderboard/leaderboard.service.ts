import { BadRequestException, Injectable } from '@nestjs/common';
import { SrsState } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TITLE_CATALOG } from '../shop/title-catalog';
import { NOT_TEST_ACCOUNT } from '../../common/test-accounts';

const LEARNED_INTERVAL_DAYS = 21;

/** Điều kiện "đã thuộc" — khớp với ProgressService. */
const LEARNED_WHERE = {
  OR: [
    { learnedAt: { not: null } },
    { state: SrsState.REVIEW, intervalDays: { gte: LEARNED_INTERVAL_DAYS } },
  ],
};

export type LeaderboardMetric = 'learned' | 'streak' | 'longest' | 'lessons';

const METRICS: Record<LeaderboardMetric, { label: string; unit: string }> = {
  learned: { label: 'Từ đã thuộc', unit: 'từ' },
  streak: { label: 'Chuỗi hiện tại', unit: 'ngày' },
  longest: { label: 'Chuỗi dài nhất', unit: 'ngày' },
  lessons: { label: 'Bài đã xong', unit: 'bài' },
};

export interface LeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  /** Danh hiệu đang dùng (mở theo huy hiệu đã đạt) — null nếu chưa chọn. */
  title: string | null;
  value: number;
  currentStreak: number;
  isMe: boolean;
  isFollowing: boolean;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  metrics() {
    return (Object.keys(METRICS) as LeaderboardMetric[]).map((key) => ({
      key,
      ...METRICS[key],
    }));
  }

  /** Bảng xếp hạng theo `metric`. Kèm hạng của user hiện tại.
   * `scope: 'friends'` chỉ xếp hạng trong nhóm (chính mình + người đang
   * theo dõi) — dùng cho thẻ "So với bạn bè" ở dashboard, cho lý do cụ thể
   * để theo dõi ai đó thay vì theo dõi xong không thấy tác dụng gì.
   * `userId` null = khách xem bảng chung (không có hạng của mình/nút theo dõi). */
  async top(
    userId: string | null,
    metric: LeaderboardMetric,
    limit = 50,
    scope: 'global' | 'friends' = 'global',
  ) {
    if (!METRICS[metric])
      throw new BadRequestException('Tiêu chí không hợp lệ');

    let ranked = await this.rankedPairs(metric);
    if (scope === 'friends' && userId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const friendIds = new Set([userId, ...follows.map((f) => f.followingId)]);
      ranked = ranked.filter((r) => friendIds.has(r.userId));
    }
    const myIndex = ranked.findIndex((r) => r.userId === userId);
    const me = {
      rank: myIndex >= 0 ? myIndex + 1 : null,
      value: myIndex >= 0 ? ranked[myIndex].value : 0,
      totalRanked: ranked.length,
    };

    const top = ranked.slice(0, limit);
    const ids = top.map((r) => r.userId);
    const [users, streaks, myFollows] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          settings: { select: { equippedTitle: true } },
        },
      }),
      this.prisma.userStreak.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, currentStreak: true },
      }),
      userId
        ? this.prisma.follow.findMany({
            where: { followerId: userId, followingId: { in: ids } },
            select: { followingId: true },
          })
        : ([] as { followingId: string }[]),
    ]);
    const uMap = new Map(users.map((u) => [u.id, u]));
    const sMap = new Map(streaks.map((s) => [s.userId, s.currentStreak]));
    const followingSet = new Set(myFollows.map((f) => f.followingId));

    const rows: LeaderboardRow[] = top.map((r, i) => {
      return {
        rank: i + 1,
        userId: r.userId,
        displayName: uMap.get(r.userId)?.displayName ?? 'Người học ẩn danh',
        avatarUrl: uMap.get(r.userId)?.avatarUrl ?? null,
        title:
          TITLE_CATALOG.find(
            (t) => t.key === uMap.get(r.userId)?.settings?.equippedTitle,
          )?.label ?? null,
        value: r.value,
        currentStreak: sMap.get(r.userId) ?? 0,
        isMe: r.userId === userId,
        isFollowing: followingSet.has(r.userId),
      };
    });

    return { metric, ...METRICS[metric], rows, me };
  }

  /** Danh sách (userId, value) đã sắp giảm dần, lọc value > 0. */
  private async rankedPairs(
    metric: LeaderboardMetric,
  ): Promise<{ userId: string; value: number }[]> {
    if (metric === 'learned') {
      const grouped = await this.prisma.userWordProgress.groupBy({
        by: ['userId'],
        where: { ...LEARNED_WHERE, user: NOT_TEST_ACCOUNT },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
      });
      return grouped.map((g) => ({ userId: g.userId, value: g._count }));
    }

    if (metric === 'lessons') {
      const grouped = await this.prisma.userLessonProgress.groupBy({
        by: ['userId'],
        where: { completedAt: { not: null }, user: NOT_TEST_ACCOUNT },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
      });
      return grouped.map((g) => ({ userId: g.userId, value: g._count }));
    }

    // streak / longest
    const field = metric === 'streak' ? 'currentStreak' : 'longestStreak';
    const streaks = await this.prisma.userStreak.findMany({
      where: { [field]: { gt: 0 }, user: NOT_TEST_ACCOUNT },
      select: { userId: true, currentStreak: true, longestStreak: true },
      orderBy: { [field]: 'desc' },
    });
    return streaks.map((s) => ({
      userId: s.userId,
      value: metric === 'streak' ? s.currentStreak : s.longestStreak,
    }));
  }
}
