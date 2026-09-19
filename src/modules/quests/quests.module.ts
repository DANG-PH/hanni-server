import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Module({
  imports: [WalletModule],
  controllers: [QuestsController],
  providers: [QuestsService],
})
export class QuestsModule {}
