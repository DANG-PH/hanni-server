import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  isLifetimePremium,
  isPremiumActive,
  PREMIUM_PLANS,
} from './premium-plans';

@Injectable()
export class PremiumService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { premiumUntil: true },
    });
    return {
      active: isPremiumActive(user.premiumUntil),
      lifetime: isLifetimePremium(user.premiumUntil),
      until: isLifetimePremium(user.premiumUntil) ? null : user.premiumUntil,
      plans: PREMIUM_PLANS,
    };
  }
}
