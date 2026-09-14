import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { WalletController } from './wallet.controller';
import { WalletListener } from './wallet.listener';
import { WalletService } from './wallet.service';

@Module({
  imports: [GamificationModule],
  controllers: [WalletController],
  providers: [WalletService, WalletListener],
  exports: [WalletService],
})
export class WalletModule {}
