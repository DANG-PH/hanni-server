import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCurrentWeek() {
    const key = currentWeekKey();
    const existing = await this.prisma.leagueWeek.findUnique({
      where: { weekKey: key },
    });
    if (existing) return existing;
    return this.prisma.leagueWeek.create({ data: { weekKey: key } });
  }

  /** Đảm bảo user có 1 dòng trong tuần hiện tại — lần đầu vào giải thì xếp
   * bậc thấp nhất; nếu tuần trước có tham gia thì mang nguyên bậc đó sang
   * (rollover đã tự thăng/giáng trước khi tuần mới bắt đầu). */
  private async getOrCreateMyEntry(userId: string) {
    const week = await this.getOrCreateCurrentWeek();
    const existing = await this.prisma.leagueEntry.findUnique({
      where: { weekId_userId: { weekId: week.id, userId } },
    });
    if (existing) return { week, entry: existing };

    const lastEntry = await this.prisma.leagueEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const entry = await this.prisma.leagueEntry.create({
      data: { weekId: week.id, userId, tier: lastEntry?.tier ?? STARTING_TIER },
    });
    return { week, entry };
  }

  private async pointsFor(
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const grouped = await this.prisma.reviewLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, reviewedAt: { gte: from, lt: to } },
      _count: true,
    });
    return new Map(grouped.map((g) => [g.userId, g._count]));
  }

  /** Giải đấu của TÔI tuần này — cùng bậc với tôi, xếp theo điểm giảm dần. */
  async getMyLeague(userId: string) {
    const { week, entry } = await this.getOrCreateMyEntry(userId);
    const groupEntries = await this.prisma.leagueEntry.findMany({
      where: { weekId: week.id, tier: entry.tier },
      select: { userId: true },
    });
    const ids = groupEntries.map((e) => e.userId);
    const points = await this.pointsFor(
      ids,
      week.startedAt,
      new Date(Math.min(Date.now(), weekKeyEnd(week.weekKey).getTime())),
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
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
    const week = await this.prisma.leagueWeek.findUnique({
      where: { id: weekId },
    });
    if (!week || week.endedAt) return; // đã rollover rồi (an toàn nếu lỡ gọi trùng)

    const entries = await this.prisma.leagueEntry.findMany({
      where: { weekId },
    });
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
        this.prisma.leagueEntry.update({
          where: { id: e.id },
          data: {
            finalPoints: points.get(e.userId) ?? 0,
            movement: movementOf.get(e.userId) ?? 'stay',
          },
        }),
      ),
    );

    await this.prisma.leagueWeek.update({
      where: { id: week.id },
      data: { endedAt: new Date() },
    });
    const nextWeek = await this.prisma.leagueWeek.create({
      data: { weekKey: currentWeekKey() },
    });
    if (entries.length) {
      await this.prisma.leagueEntry.createMany({
        data: entries.map((e) => ({
          weekId: nextWeek.id,
          userId: e.userId,
          tier: nextTierOf.get(e.userId) ?? e.tier,
        })),
      });
    }
  }
}
