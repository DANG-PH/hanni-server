import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { MinigameController } from './minigame.controller';
import { MinigameService } from './minigame.service';

@Module({
  imports: [WalletModule],
  controllers: [MinigameController],
  providers: [MinigameService],
})
export class MinigameModule {}
