import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DuelSeasonService } from './duel-season.service';
import { DuelController } from './duel.controller';
import { TeamDuelController } from './team-duel.controller';

@Module({
  imports: [NotificationsModule, WalletModule],
  controllers: [DuelController, TeamDuelController],
  providers: [DuelSeasonService],
})
export class DuelModule {}
