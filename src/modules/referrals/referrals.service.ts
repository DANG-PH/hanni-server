import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from '../../database/entities';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
  ) {}

  /** Thống kê cho trang "Mời bạn bè" — số người đã giới thiệu, đã được
   * thưởng, và đang chờ (đã đăng ký nhưng chưa học ngày đầu tiên). */
  async getStats(userId: string) {
    const referrals = await this.referrals.findBy({ referrerId: userId });
    return {
      totalReferred: referrals.length,
      rewardedCount: referrals.filter((r) => r.rewardedAt).length,
      pendingCount: referrals.filter((r) => !r.rewardedAt).length,
    };
  }
}
