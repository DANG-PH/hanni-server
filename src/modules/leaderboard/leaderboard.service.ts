import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { notTestAccount } from '../../common/test-accounts';
import {
  User,
  UserLessonProgress,
  UserStreak,
  UserWordProgress,
} from '../../database/entities';
import { SrsState } from '../../database/enums';
import { TITLE_CATALOG } from '../shop/title-catalog';
import { LEARNED_INTERVAL_DAYS } from '../srs/srs.constants';

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
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    @InjectRepository(UserWordProgress)
    private readonly wordProgress: Repository<UserWordProgress>,
    @InjectRepository(UserLessonProgress)
    private readonly lessonProgress: Repository<UserLessonProgress>,
  ) {}

  metrics() {
    return (Object.keys(METRICS) as LeaderboardMetric[]).map((key) => ({
      key,
      ...METRICS[key],
    }));
  }

  /** Bảng xếp hạng theo `metric`, kèm hạng của user hiện tại.
   * `userId` null = khách xem bảng chung (không có hạng của mình). */
  async top(userId: string | null, metric: LeaderboardMetric, limit = 50) {
    if (!METRICS[metric])
      throw new BadRequestException('Tiêu chí không hợp lệ');

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
        relations: { settings: true },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          settings: { userId: true, equippedTitle: true },
        },
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
        title:
          TITLE_CATALOG.find(
            (t) => t.key === uMap.get(r.userId)?.settings?.equippedTitle,
          )?.label ?? null,
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
    if (metric === 'learned') {
      // Số từ "đã thuộc" mỗi người — cùng định nghĩa với ProgressService.
      return this.wordProgress
        .createQueryBuilder('p')
        .innerJoin('p.user', 'u')
        .select('p.userId', 'userId')
        .addSelect('COUNT(*)::int', 'value')
        .where(
          '(p.learnedAt IS NOT NULL OR (p.state = :review AND p.intervalDays >= :days))',
          { review: SrsState.REVIEW, days: LEARNED_INTERVAL_DAYS },
        )
        .andWhere(notTestAccount('u'))
        .groupBy('p.userId')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ userId: string; value: number }>();
    }

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

    // streak / longest
    const field = metric === 'streak' ? 'currentStreak' : 'longestStreak';
    return this.streaks
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .select('s.userId', 'userId')
      .addSelect(`s.${field}`, 'value')
      .where(`s.${field} > 0`)
      .andWhere(notTestAccount('u'))
      .orderBy(`s.${field}`, 'DESC')
      .getRawMany<{ userId: string; value: number }>();
  }
}
