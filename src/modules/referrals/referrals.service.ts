import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Thống kê cho trang "Mời bạn bè" — số người đã giới thiệu, đã được
   * thưởng, và đang chờ (đã đăng ký nhưng chưa học ngày đầu tiên). */
  async getStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
    });
    return {
      totalReferred: referrals.length,
      rewardedCount: referrals.filter((r) => r.rewardedAt).length,
      pendingCount: referrals.filter((r) => !r.rewardedAt).length,
    };
  }
}
