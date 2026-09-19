import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { TitleService } from './title.service';

@Module({
  imports: [WalletModule],
  controllers: [ShopController],
  providers: [ShopService, TitleService],
})
export class ShopModule {}
