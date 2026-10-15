import { Module } from '@nestjs/common';
import { PinyinController } from './pinyin.controller';
import { PinyinService } from './pinyin.service';

@Module({
  controllers: [PinyinController],
  providers: [PinyinService],
})
export class PinyinModule {}
