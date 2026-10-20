import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from '../../database/entities';
import { AppEvent, type StreakUpdatedPayload } from '../../events/events';
import { StreakService } from '../gamification/streak/streak.service';

/**
 * Thưởng giới thiệu bạn mới: khi user được giới thiệu hoàn thành NGÀY HỌC
 * ĐẦU TIÊN trong đời tài khoản (currentStreak VÀ longestStreak cùng bằng 1 —
 * dấu hiệu đây là streak đầu tiên, không phải bắt đầu lại sau khi đứt
 * chuỗi cũ, vì longestStreak không giảm khi streak đứt), cả người giới
 * thiệu lẫn người được giới thiệu đều nhận +1 "lá chắn" streak.
 */
@Injectable()
export class ReferralsListener {
  private readonly logger = new Logger(ReferralsListener.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
    private readonly streak: StreakService,
  ) {}

  @OnEvent(AppEvent.StreakUpdated, { async: true })
  async onStreakUpdated(p: StreakUpdatedPayload): Promise<void> {
    if (p.currentStreak !== 1 || p.longestStreak !== 1) return;

    try {
      const referral = await this.referrals.findOneBy({
        referredId: p.userId,
      });
      if (!referral || referral.rewardedAt) return;

      await Promise.all([
        this.streak.grantFreeze(referral.referrerId),
        this.streak.grantFreeze(referral.referredId),
      ]);
      await this.referrals.update(referral.id, { rewardedAt: new Date() });
    } catch (err) {
      this.logger.error(`onStreakUpdated: ${(err as Error).message}`);
    }
  }
}
