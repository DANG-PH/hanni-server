import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WordQueryDto } from './dto/word-query.dto';
import { HskLevelsService } from './hsk-levels.service';
import { WordsService } from './words.service';

@ApiTags('vocabulary')
@ApiBearerAuth()
@Controller()
export class VocabularyController {
  constructor(
    private readonly words: WordsService,
    private readonly levels: HskLevelsService,
  ) {}

  @Get('levels')
  listLevels() {
    return this.levels.list();
  }

  @Get('levels/:level')
  getLevel(@Param('level', ParseIntPipe) level: number) {
    return this.levels.get(level);
  }

  @Get('words')
  listWords(@Query() query: WordQueryDto) {
    return this.words.list(query);
  }

  @Get('words/of-the-day')
  getWordOfTheDay() {
    return this.words.ofTheDay();
  }

  @Public()
  @Get('words/stats')
  getWordStats() {
    return this.words.stats();
  }

  /** Từ điển công khai (SEO) — xem WordsService.lookup(). Đặt dưới
   * `dictionary/` thay vì `words/` để không đụng `words/:id` (ParseUUIDPipe). */
  @Public()
  @Get('dictionary/slugs')
  getDictionarySlugs() {
    return this.words.publicSlugs();
  }

  @Public()
  @Get('dictionary/:slug')
  lookupWord(@Param('slug') slug: string) {
    return this.words.lookup(slug);
  }

  @Get('words/:id')
  getWord(@Param('id', ParseUUIDPipe) id: string) {
    return this.words.get(id);
  }
}
