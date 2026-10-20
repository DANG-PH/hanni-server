import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import {
  LeagueEntry,
  LeagueWeek,
  ReviewLog,
  User,
} from '../../database/entities';
import { findOrCreate, insertAndReturn } from '../../database/repository.util';
import {
  currentWeekKey,
  LEAGUE_TIERS,
  planRollover,
  STARTING_TIER,
  weekKeyEnd,
  weekKeyStart,
  zoneOf,
} from './league.util';

export interface LeagueRow {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  isMe: boolean;
  zone: 'promote' | 'demote' | 'safe';
}

@Injectable()
export class LeagueService {
  private readonly logger = new Logger(LeagueService.name);

  constructor(
    @InjectRepository(LeagueWeek)
    private readonly weeks: Repository<LeagueWeek>,
    @InjectRepository(LeagueEntry)
    private readonly entries: Repository<LeagueEntry>,
    @InjectRepository(ReviewLog)
    private readonly reviewLogs: Repository<ReviewLog>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  getOrCreateCurrentWeek() {
    return findOrCreate(this.weeks, { weekKey: currentWeekKey() });
  }

  /** Đảm bảo user có 1 dòng trong tuần hiện tại — lần đầu vào giải thì xếp
   * bậc thấp nhất; nếu tuần trước có tham gia thì mang nguyên bậc đó sang
   * (rollover đã tự thăng/giáng trước khi tuần mới bắt đầu). */
  private async getOrCreateMyEntry(userId: string) {
    const week = await this.getOrCreateCurrentWeek();
    const existing = await this.entries.findOneBy({ weekId: week.id, userId });
    if (existing) return { week, entry: existing };

    const lastEntry = await this.entries.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const entry = await insertAndReturn(this.entries, {
      weekId: week.id,
      userId,
      tier: lastEntry?.tier ?? STARTING_TIER,
    });
    return { week, entry };
  }

  private async pointsFor(
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    // Điểm tuần = số lượt ôn (ReviewLog) trong [from, to).
    const grouped = await this.reviewLogs
      .createQueryBuilder('log')
      .select('log.userId', 'userId')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.userId IN (:...userIds)', { userIds })
      .andWhere('log.reviewedAt >= :from AND log.reviewedAt < :to', {
        from,
        to,
      })
      .groupBy('log.userId')
      .getRawMany<{ userId: string; count: number }>();
    return new Map(grouped.map((g) => [g.userId, g.count]));
  }

  /** Giải đấu của TÔI tuần này — cùng bậc với tôi, xếp theo điểm giảm dần. */
  async getMyLeague(userId: string) {
    const { week, entry } = await this.getOrCreateMyEntry(userId);
    const groupEntries = await this.entries.find({
      where: { weekId: week.id, tier: entry.tier },
      select: { id: true, userId: true },
    });
    const ids = groupEntries.map((e) => e.userId);
    const points = await this.pointsFor(
      ids,
      weekKeyStart(week.weekKey),
      new Date(Math.min(Date.now(), weekKeyEnd(week.weekKey).getTime())),
    );
    const users = await this.users.find({
      where: { id: In(ids) },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const uMap = new Map(users.map((u) => [u.id, u]));

    const ranked = ids
      .map((id) => ({ userId: id, points: points.get(id) ?? 0 }))
      .sort((a, b) => b.points - a.points);

    const ZONE = { up: 'promote', down: 'demote', stay: 'safe' } as const;
    const rows: LeagueRow[] = ranked.map((r, i) => {
      const rank = i + 1;
      const zone = ZONE[zoneOf(rank, ranked.length, entry.tier, r.points)];
      return {
        rank,
        userId: r.userId,
        displayName: uMap.get(r.userId)?.displayName ?? 'Người học ẩn danh',
        avatarUrl: uMap.get(r.userId)?.avatarUrl ?? null,
        points: r.points,
        isMe: r.userId === userId,
        zone,
      };
    });

    const endsAt = weekKeyEnd(week.weekKey);
    return {
      tier: LEAGUE_TIERS[entry.tier],
      tierIndex: entry.tier,
      tiers: LEAGUE_TIERS,
      rows,
      endsAt,
      daysRemaining: Math.max(
        0,
        Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000),
      ),
    };
  }

  /** Mỗi giờ: chốt các tuần ĐÃ QUA mà chưa chốt, cũ nhất trước — chốt tuần N mang bậc mới sang tuần
   * N+1, nếu N+1 cũng đã qua thì vòng sau chốt tiếp (bù được cả khi server tắt nhiều tuần). Gọi lại vô hại. */
  @Cron(CronExpression.EVERY_HOUR)
  async checkRollover(): Promise<void> {
    for (;;) {
      const now = Date.now();
      const open = await this.weeks.findBy({ endedAt: IsNull() });
      const [oldest] = open
        .filter((w) => weekKeyEnd(w.weekKey).getTime() <= now)
        .sort(
          (a, b) =>
            weekKeyStart(a.weekKey).getTime() -
            weekKeyStart(b.weekKey).getTime(),
        );
      if (!oldest) return;
      await this.rolloverWeek(oldest);
    }
  }

  private async rolloverWeek(week: LeagueWeek): Promise<void> {
    const entries = await this.entries.findBy({ weekId: week.id });
    this.logger.log(
      `Kết thúc tuần giải đấu ${week.weekKey} — ${entries.length} người tham gia`,
    );
    const points = await this.pointsFor(
      entries.map((e) => e.userId),
      weekKeyStart(week.weekKey),
      weekKeyEnd(week.weekKey),
    );
    const plan = planRollover(entries, points);

    await this.dataSource.transaction(async (db) => {
      for (const e of entries) {
        await db.update(LeagueEntry, e.id, {
          finalPoints: points.get(e.userId) ?? 0,
          movement: plan.get(e.userId)?.movement ?? 'stay',
        });
      }
      await db.update(LeagueWeek, week.id, { endedAt: new Date() });

      // Tuần kế tiếp có thể đã có sẵn (có người mở giải đấu trước lượt chốt — dòng của họ mang bậc CŨ)
      // nên upsert: ghi đè bậc theo kết quả vừa chốt.
      const nextKey = currentWeekKey(weekKeyEnd(week.weekKey));
      const nextWeek = await findOrCreate(db.getRepository(LeagueWeek), {
        weekKey: nextKey,
      });
      if (entries.length)
        await db.upsert(
          LeagueEntry,
          entries.map((e) => ({
            weekId: nextWeek.id,
            userId: e.userId,
            tier: plan.get(e.userId)?.tier ?? e.tier,
          })),
          ['weekId', 'userId'],
        );
    });
  }
}
