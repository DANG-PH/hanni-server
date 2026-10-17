import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { TitleService } from './title.service';

@Module({
  controllers: [ShopController],
  providers: [ShopService, TitleService],
})
export class ShopModule {}
