import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import {
  isLifetimePremium,
  isPremiumActive,
  PREMIUM_PLANS,
} from './premium-plans';

@Injectable()
export class PremiumService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async getStatus(userId: string) {
    const user = await this.users.findOneOrFail({
      where: { id: userId },
      select: { id: true, premiumUntil: true },
    });
    return {
      active: isPremiumActive(user.premiumUntil),
      lifetime: isLifetimePremium(user.premiumUntil),
      until: isLifetimePremium(user.premiumUntil) ? null : user.premiumUntil,
      plans: PREMIUM_PLANS,
    };
  }
}
