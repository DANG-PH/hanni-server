import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import {
  AddWordDto,
  QueueQueryDto,
  ReviewDto,
  SuspendWordDto,
} from './dto/srs.dto';
import { ReviewService } from './review.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /study/queue                  [đăng nhập]  Buổi ôn flashcard /study?review=1 hoặc /study?lesson=<id> —
 *                                                      hàng đợi thẻ đến hạn
 *                                                      → queue() → ReviewService.getQueue()
 *                                                      client: app/(app)/study/page.tsx
 * GET       /study/stats                  [đăng nhập]  Số từ cần ôn (huy hiệu cạnh mục Ôn tập ở menu), thẻ "Từ cần
 *                                                      ôn" ở /learn, màn chọn bộ thẻ /study
 *                                                      → stats() → ReviewService.getStats()
 *                                                      client: lib/hooks.ts (useStudyStats)
 * GET       /study/leeches                [đăng nhập]  Mục "Từ khó nhớ" ở /progress; buổi ôn riêng /study?leeches=1
 *                                                      → leeches() → ReviewService.getLeeches()
 *                                                      client: app/(app)/study/page.tsx · lib/hooks.ts (useLeeches)
 * POST      /study/review                 [đăng nhập]  Bấm 1 trong 4 nút đánh giá dưới flashcard ở /study (Quên / Khó
 *                                                      / Nhớ / Dễ)
 *                                                      → review() → ReviewService.review()
 *                                                      client: app/(app)/study/page.tsx
 * GET       /study/suspended              [đăng nhập]  Mục "Từ đã ẩn" ở /progress
 *                                                      → suspended() → ReviewService.getSuspended()
 *                                                      client: lib/hooks.ts (useSuspendedWords)
 * POST      /study/words/:wordId/suspend  [đăng nhập]  Nút "Tôi đã biết từ này" (flashcard, trang từ) / "Học lại"
 *                                                      (/progress)
 *                                                      → suspend() → ReviewService.setSuspended()
 *                                                      client: lib/hooks.ts (suspendWord)
 * POST      /study/add-word               [đăng nhập]  Nút "Lưu để ôn tập" ở trang từ, video, quét ảnh, chữa bài thi
 *                                                      thử
 *                                                      → addWord() → ReviewService.addWord()
 *                                                      client: lib/hooks.ts (addWordToSrs)
 */
@ApiTags('study')
@ApiBearerAuth()
@Controller('study')
export class SrsController {
  constructor(private readonly reviews: ReviewService) {}

  @Get('queue')
  queue(@CurrentUser() user: AuthUser, @Query() query: QueueQueryDto) {
    return this.reviews.getQueue(user.id, query);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.reviews.getStats(user.id);
  }

  @Get('leeches')
  leeches(@CurrentUser() user: AuthUser) {
    return this.reviews.getLeeches(user.id);
  }

  @Post('review')
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.reviews.review(user.id, dto);
  }

  @Get('suspended')
  suspended(@CurrentUser() user: AuthUser) {
    return this.reviews.getSuspended(user.id);
  }

  /** "Tôi biết từ này rồi" — ẩn khỏi mọi hàng đợi ôn, bỏ ẩn được bất cứ lúc
   * nào ở `/progress`. */
  @Post('words/:wordId/suspend')
  suspend(
    @CurrentUser() user: AuthUser,
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Body() dto: SuspendWordDto,
  ) {
    return this.reviews.setSuspended(user.id, wordId, dto.suspended);
  }

  @Post('add-word')
  addWord(@CurrentUser() user: AuthUser, @Body() dto: AddWordDto) {
    return this.reviews.addWord(user.id, dto.wordId);
  }
}
