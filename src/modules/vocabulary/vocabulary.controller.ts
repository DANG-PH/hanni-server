import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WordQueryDto } from './dto/word-query.dto';
import { HskLevelsService } from './hsk-levels.service';
import { WordsService } from './words.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /levels               [khách]      Thông tin 7 cấp HSK (số từ mỗi cấp): tab cấp ở /learn, /tu-dien, /hsk,
 *                                              /progress
 *                                              → listLevels() → HskLevelsService.list()
 *                                              client: app/(site)/hsk/page.tsx · app/(site)/tu-dien/page.tsx ·
 *                                                      lib/hooks.ts (preloadLearnHome) · lib/hooks.ts (useLevels)
 * GET       /words                [khách]      Ô tra từ: gợi ý khi gõ (trang chủ /, /tu-dien) + kết quả tra + danh
 *                                              sách từ theo cấp; luyện nghe/phát âm theo bài
 *                                              → listWords() → WordsService.list()
 *                                              client: app/(site)/hoc-thu/page.tsx · app/(site)/tu-dien/page.tsx ·
 *                                                      components/dictionary/dictionary-search.tsx · lib/hooks.ts
 *                                                      (useWords)
 * GET       /words/of-the-day     [khách]      Thẻ "Từ vựng hôm nay" ở /learn và trang chủ từ điển
 *                                              → getWordOfTheDay() → WordsService.ofTheDay()
 *                                              client: components/word-of-the-day.tsx
 * GET       /words/stats          [khách]      Con số "N từ · M từ có âm Hán Việt" ở trang chủ /, /gioi-thieu,
 *                                              /hop-tac, /tu-dien
 *                                              → getWordStats() → WordsService.stats()
 *                                              client: app/(site)/gioi-thieu/page.tsx · app/(site)/hop-tac/page.tsx ·
 *                                                      app/(site)/tu-dien/page.tsx · lib/hooks.ts (useWordStats)
 * GET       /words/familiar       [khách]      Trang "Từ bạn đã biết sẵn" /tu-da-biet
 *                                              → getFamiliarWords() → WordsService.familiarWords()
 *                                              client: app/(site)/tu-da-biet/page.tsx
 * GET       /words/trial          [khách]      8 thẻ học thử /hoc-thu
 *                                              → getTrialWords() → WordsService.trialWords()
 *                                              client: app/(site)/hoc-thu/page.tsx
 * GET       /dictionary/slugs     [khách]      Không phải giao diện: sitemap.xml liệt kê mọi trang từ cho Google
 *                                              → getDictionarySlugs() → WordsService.publicSlugs()
 *                                              client: app/sitemap.ts
 * GET       /dictionary/char/:c   [khách]      Tab "Hán tự" của kết quả tra /tu-dien?q=…&tab=han-tu (bộ thủ, số nét,
 *                                              từ chứa chữ)
 *                                              → lookupChar() → WordsService.charLookup()
 *                                              client: app/(site)/tu-dien/page.tsx
 * GET       /dictionary/examples  [khách]      Tab "Ví dụ" của kết quả tra /tu-dien?q=…&tab=vi-du
 *                                              → searchExamples() → WordsService.searchExamples()
 *                                              client: app/(site)/tu-dien/page.tsx
 * GET       /dictionary/:slug     [khách]      Trang 1 từ /tu-dien/[slug] (nghĩa, Hán Việt, phân tích từng chữ, lượng
 *                                              từ, câu ví dụ, video)
 *                                              → lookupWord() → WordsService.lookup()
 *                                              client: app/(site)/tu-dien/[slug]/page.tsx
 */
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

  /** Tab "Hán tự" của từ điển — khai báo TRƯỚC `dictionary/:slug`. */
  @Public()
  @Get('dictionary/char/:c')
  lookupChar(@Param('c') c: string) {
    return this.words.charLookup(c);
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
}
