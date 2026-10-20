import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  MAX_TIER,
  MIN_GROUP_FOR_MOVEMENT,
  promoteDemoteCount,
  STARTING_TIER,
  weekKeyEnd,
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
      week.startedAt,
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

    const promoteN =
      ranked.length >= MIN_GROUP_FOR_MOVEMENT
        ? promoteDemoteCount(ranked.length)
        : 0;
    const demoteN = promoteN;

    const rows: LeagueRow[] = ranked.map((r, i) => {
      const rank = i + 1;
      const zone: LeagueRow['zone'] =
        entry.tier < MAX_TIER && rank <= promoteN
          ? 'promote'
          : entry.tier > STARTING_TIER && rank > ranked.length - demoteN
            ? 'demote'
            : 'safe';
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

  /** Chạy mỗi ngày — chỉ THẬT SỰ rollover khi khoá tuần đã đổi, gọi lại
   * nhiều lần trong cùng 1 tuần vô hại (idempotent theo `weekKey`). */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkRollover(): Promise<void> {
    const week = await this.getOrCreateCurrentWeek();
    if (week.weekKey === currentWeekKey()) return;
    await this.rolloverWeek(week.id);
  }

  private async rolloverWeek(weekId: string): Promise<void> {
    const week = await this.weeks.findOneBy({ id: weekId });
    if (!week || week.endedAt) return; // đã rollover rồi (an toàn nếu lỡ gọi trùng)

    const entries = await this.entries.findBy({ weekId });
    this.logger.log(
      `Kết thúc tuần giải đấu ${week.weekKey} — ${entries.length} người tham gia`,
    );
    const points = await this.pointsFor(
      entries.map((e) => e.userId),
      week.startedAt,
      weekKeyEnd(week.weekKey),
    );

    const byTier = new Map<number, typeof entries>();
    for (const e of entries) {
      byTier.set(e.tier, [...(byTier.get(e.tier) ?? []), e]);
    }

    const nextTierOf = new Map<string, number>();
    const movementOf = new Map<string, 'up' | 'down' | 'stay'>();
    for (const [tier, group] of byTier) {
      const ranked = [...group].sort(
        (a, b) => (points.get(b.userId) ?? 0) - (points.get(a.userId) ?? 0),
      );
      const n =
        ranked.length >= MIN_GROUP_FOR_MOVEMENT
          ? promoteDemoteCount(ranked.length)
          : 0;
      ranked.forEach((e, i) => {
        const rank = i + 1;
        if (tier < MAX_TIER && rank <= n) {
          nextTierOf.set(e.userId, tier + 1);
          movementOf.set(e.userId, 'up');
        } else if (tier > STARTING_TIER && rank > ranked.length - n) {
          nextTierOf.set(e.userId, tier - 1);
          movementOf.set(e.userId, 'down');
        } else {
          nextTierOf.set(e.userId, tier);
          movementOf.set(e.userId, 'stay');
        }
      });
    }
    await Promise.all(
      entries.map((e) =>
        this.entries.update(e.id, {
          finalPoints: points.get(e.userId) ?? 0,
          movement: movementOf.get(e.userId) ?? 'stay',
        }),
      ),
    );

    await this.weeks.update(week.id, { endedAt: new Date() });
    const nextWeek = await insertAndReturn(this.weeks, {
      weekKey: currentWeekKey(),
    });
    if (entries.length) {
      await this.entries.insert(
        entries.map((e) => ({
          weekId: nextWeek.id,
          userId: e.userId,
          tier: nextTierOf.get(e.userId) ?? e.tier,
        })),
      );
    }
  }
}
