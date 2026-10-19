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

  /** Công khai: dữ liệu từ vựng/cấp HSK vốn là dữ liệu mở (CC BY-SA, xem
   * data/NOTICES.md), không có gì nhạy cảm để giấu sau đăng nhập. Mở ra để
   * trang `/tu-dien` (Server Component, index được bởi Google) dùng CHUNG
   * đúng 1 nguồn với trang duyệt trong app — trước đây `/vocabulary` cần
   * đăng nhập nên phải dựng endpoint riêng cho bản công khai, thành 2 hệ
   * thống rời rạc hiển thị cùng một thứ. */
  @Public()
  @Get('levels')
  listLevels() {
    return this.levels.list();
  }

  @Public()
  @Get('levels/:level')
  getLevel(@Param('level', ParseIntPipe) level: number) {
    return this.levels.get(level);
  }

  @Public()
  @Get('words')
  listWords(@Query() query: WordQueryDto) {
    return this.words.list(query);
  }

  /** `?level=` = cấp HSK đang học — trước đó người HSK 1 nhận cả từ HSK 4.
   * Giống nhau cho mọi người, không có gì riêng tư → khách cũng xem được. */
  @Public()
  @Get('words/of-the-day')
  getWordOfTheDay(
    @Query('level', new ParseIntPipe({ optional: true })) level?: number,
  ) {
    return this.words.ofTheDay(level);
  }

  @Public()
  @Get('words/stats')
  getWordStats() {
    return this.words.stats();
  }

  /** "Từ bạn đã biết sẵn" — hook thu hút người Việt chưa học tiếng Trung,
   * xem WordsService.familiarWords(). */
  @Public()
  @Get('words/familiar')
  getFamiliarWords(@Query('level') level?: string) {
    const lv = Number(level);
    return this.words.familiarWords(lv >= 1 && lv <= 9 ? lv : undefined);
  }

  /** 8 từ cho bộ thẻ học thử ở `/hoc-thu` — xem WordsService.trialWords(). */
  @Public()
  @Get('words/trial')
  getTrialWords() {
    return this.words.trialWords();
  }

  /** Từ điển công khai (SEO) — xem WordsService.lookup(). Đặt dưới
   * `dictionary/` thay vì `words/` để không đụng `words/:id` (ParseUUIDPipe). */
  @Public()
  @Get('dictionary/slugs')
  getDictionarySlugs() {
    return this.words.publicSlugs();
  }

  /** Tab "Ví dụ" của từ điển — khai báo TRƯỚC `dictionary/:slug`. */
  @Public()
  @Get('dictionary/examples')
  searchExamples(@Query('q') q = '', @Query('page') page = '1') {
    return this.words.searchExamples(q, Number(page) || 1);
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
