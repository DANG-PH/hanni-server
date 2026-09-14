import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsListener } from './referrals.listener';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [GamificationModule],
  controllers: [ReferralsController],
  providers: [ReferralsService, ReferralsListener],
})
export class ReferralsModule {}
