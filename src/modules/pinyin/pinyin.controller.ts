import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PinyinService } from './pinyin.service';

@ApiTags('pinyin')
@Controller('pinyin')
export class PinyinController {
  constructor(private readonly pinyin: PinyinService) {}

  /** Bảng phiên âm công khai: âm tiết có ghi âm thật + quy luật Hán Việt → thanh. */
  @Public()
  @Get('overview')
  overview() {
    return this.pinyin.overview();
  }
}
