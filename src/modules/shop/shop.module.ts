import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { TitleService } from './title.service';

@Module({
  controllers: [ShopController],
  providers: [TitleService],
})
export class ShopModule {}
