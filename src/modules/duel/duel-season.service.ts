import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { computeTier, currentSeasonKey, seasonReward } from './duel-rank.util';

/**
 * Mùa giải ELO — Giai đoạn 3 minigame (FEATURES.md). Reset theo THÁNG DƯƠNG
 * LỊCH (không phải 30 ngày tròn) — dễ hiểu hơn cho người chơi ("mùa tháng
 * 9", "mùa tháng 10"), y hệt cách nhiều game rank làm.
 */
@Injectable()
export class DuelSeasonService {
  private readonly logger = new Logger(DuelSeasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async getOrCreateActiveSeason() {
    const active = await this.prisma.duelSeason.findFirst({
      where: { endedAt: null },
      orderBy: { number: 'desc' },
    });
    if (active) return active;
    return this.prisma.duelSeason.create({
      data: { number: currentSeasonKey() },
    });
  }

  async getSeasonInfo() {
    const season = await this.getOrCreateActiveSeason();
    const now = new Date();
    const endsAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    return {
      number: season.number,
      startedAt: season.startedAt,
      endsAt,
      daysRemaining: Math.max(
        0,
        Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000),
      ),
    };
  }

  /** Chạy mỗi ngày — chỉ THẬT SỰ rollover khi khoá tháng đã đổi, nên gọi lại
   * nhiều lần trong cùng 1 tháng vô hại (idempotent theo `number`). */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkRollover(): Promise<void> {
    const season = await this.getOrCreateActiveSeason();
    if (season.number === currentSeasonKey()) return;
    await this.rolloverSeason(season.id);
  }

  private async rolloverSeason(seasonId: string): Promise<void> {
    const season = await this.prisma.duelSeason.findUnique({
      where: { id: seasonId },
    });
    if (!season || season.endedAt) return; // đã rollover rồi (an toàn nếu lỡ gọi trùng)

    const ratings = await this.prisma.userRating.findMany({
      orderBy: { elo: 'desc' },
    });
    this.logger.log(
      `Kết thúc mùa ${season.number} — ${ratings.length} người chơi có rank`,
    );

    const resultsData = ratings.map((r, i) => {
      const rank = i + 1;
      // computeTier (không phải tierForElo thô) — Thách Đấu cuối mùa cũng
      // phải nằm trong top CHALLENGER_TOP_N mới được tính thưởng bậc đó,
      // khớp đúng logic hiển thị lúc đang mùa (xem duel.service.ts).
      const tier = computeTier(r.elo, rank);
      return {
        seasonId: season.id,
        userId: r.userId,
        finalElo: r.elo,
        tier: tier.name,
        rank,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        coinsAwarded: seasonReward(tier, rank),
      };
    });

    if (resultsData.length) {
      await this.prisma.duelSeasonResult.createMany({ data: resultsData });
      for (const r of resultsData) {
        if (r.coinsAwarded > 0) {
          await this.wallet.credit(
            r.userId,
            r.coinsAwarded,
            'duel_season_reward',
          );
        }
      }
    }

    await this.prisma.duelSeason.update({
      where: { id: season.id },
      data: { endedAt: new Date() },
    });
    await this.prisma.duelSeason.create({
      data: { number: currentSeasonKey() },
    });
    // Soft reset TOÀN BỘ trong 1 câu SQL atomic (giống lý do dùng updateMany
    // có điều kiện ở WalletService.debit() — tránh đọc-rồi-ghi từng dòng);
    // công thức y hệt `softResetElo()` ở duel-rank.util.ts, viết lại bằng SQL
    // vì cần áp dụng cho MỌI user trong 1 lệnh chứ không phải 1 user.
    await this.prisma.$executeRaw`
      UPDATE "UserRating"
      SET elo = 1000 + ROUND((elo - 1000) * 0.5)::int, wins = 0, losses = 0, draws = 0
    `;
  }
}
