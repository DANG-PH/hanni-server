import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { notTestAccount } from '../../common/test-accounts';
import { User, UserLessonProgress, UserStreak } from '../../database/entities';

/** 2 tiêu chí xếp hạng (bỏ "Từ đã thuộc" — cần ~21 ngày ôn mới có, trống với mọi người — và "Chuỗi dài nhất" — trùng
 * ý "Chuỗi hiện tại"). Mô tả + nút của từng tab nằm ở client (`components/leaderboard.tsx`). */
export const LEADERBOARD_METRICS = ['streak', 'lessons'] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];
const METRICS: Record<LeaderboardMetric, { label: string; unit: string }> = {
  streak: { label: 'Chuỗi hiện tại', unit: 'ngày' },
  lessons: { label: 'Bài đã xong', unit: 'bài' },
};

export interface LeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  value: number;
  currentStreak: number;
  isMe: boolean;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    @InjectRepository(UserLessonProgress)
    private readonly lessonProgress: Repository<UserLessonProgress>,
  ) {}

  /** Bảng xếp hạng theo `metric`, kèm hạng của user hiện tại.
   * `userId` null = khách xem bảng chung (không có hạng của mình). */
  async top(userId: string | null, metric: LeaderboardMetric, limit = 50) {
    const ranked = await this.rankedPairs(metric);
    const myIndex = ranked.findIndex((r) => r.userId === userId);
    const me = {
      rank: myIndex >= 0 ? myIndex + 1 : null,
      value: myIndex >= 0 ? ranked[myIndex].value : 0,
      totalRanked: ranked.length,
    };

    const top = ranked.slice(0, limit);
    const ids = top.map((r) => r.userId);
    const [users, streaks] = await Promise.all([
      this.users.find({
        where: { id: In(ids) },
        select: { id: true, displayName: true, avatarUrl: true },
      }),
      this.streaks.find({
        where: { userId: In(ids) },
        select: { userId: true, currentStreak: true },
      }),
    ]);
    const uMap = new Map(users.map((u) => [u.id, u]));
    const sMap = new Map(streaks.map((s) => [s.userId, s.currentStreak]));

    const rows: LeaderboardRow[] = top.map((r, i) => {
      return {
        rank: i + 1,
        userId: r.userId,
        displayName: uMap.get(r.userId)?.displayName ?? 'Người học ẩn danh',
        avatarUrl: uMap.get(r.userId)?.avatarUrl ?? null,
        value: r.value,
        currentStreak: sMap.get(r.userId) ?? 0,
        isMe: r.userId === userId,
      };
    });

    return { metric, ...METRICS[metric], rows, me };
  }

  /** Danh sách (userId, value) đã sắp giảm dần, lọc value > 0. */
  private async rankedPairs(
    metric: LeaderboardMetric,
  ): Promise<{ userId: string; value: number }[]> {
    if (metric === 'lessons') {
      return this.lessonProgress
        .createQueryBuilder('p')
        .innerJoin('p.user', 'u')
        .select('p.userId', 'userId')
        .addSelect('COUNT(*)::int', 'value')
        .where('p.completedAt IS NOT NULL')
        .andWhere(notTestAccount('u'))
        .groupBy('p.userId')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ userId: string; value: number }>();
    }

    return this.streaks
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .select('s.userId', 'userId')
      .addSelect('s.currentStreak', 'value')
      .where('s.currentStreak > 0')
      .andWhere(notTestAccount('u'))
      .orderBy('s.currentStreak', 'DESC')
      .getRawMany<{ userId: string; value: number }>();
  }
}
