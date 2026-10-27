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
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { AiToolsService } from './ai-tools.service';
import {
  AnalyzeDto,
  SegmentQueryDto,
  SentenceCheckDto,
} from './dto/ai-tools.dto';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /ai/usage              [đăng nhập]  Số lượt AI đã dùng hôm nay — hook useAiUsage có sẵn nhưng hiện CHƯA
 *                                               trang nào hiện
 *                                               → usage() → AiToolsService.usage()
 *                                               client: lib/ai-tools.ts (useAiUsage)
 * POST      /ai/mnemonic/:wordId   [đăng nhập]  Nút "Tạo mẹo nhớ" (AI) ở trang từ /tu-dien/[slug] — tạo 1 lần, lưu
 *                                               Word.mnemonicVi cho mọi người
 *                                               → mnemonic() → AiToolsService.mnemonic()
 *                                               client: lib/ai-tools.ts (generateMnemonic)
 * POST      /ai/sentence-check     [đăng nhập]  Ô "Đặt câu với từ này" ở trang từ /tu-dien/[slug] — AI chấm câu học
 *                                               viên tự đặt
 *                                               → checkSentence() → AiToolsService.checkSentence()
 *                                               client: lib/ai-tools.ts (checkSentence)
 * GET       /ai/segment            [khách]      Dán cả câu vào ô tra /tu-dien?q=… → pinyin + âm Hán Việt từng từ
 *                                               (KHÔNG gọi AI, tách theo từ điển)
 *                                               → segment() → AiToolsService.segment()
 *                                               client: app/(site)/tu-dien/page.tsx
 * POST      /ai/analyze            [đăng nhập]  Nút "Phân tích câu bằng AI" dưới kết quả tra câu ở /tu-dien?q=…
 *                                               → analyze() → AiToolsService.analyze()
 *                                               client: lib/ai-tools.ts (analyzeText)
 * GET       /ai/reading/:lessonId  [khách]      Trang bài đọc /bai-doc/[lessonId] — đọc bài đọc AI đã có của bài học
 *                                               → reading() → AiToolsService.reading()
 *                                               client: lib/reading.ts (key)
 * POST      /ai/reading/:lessonId  [đăng nhập]  Nút "Viết bài đọc cho bài này (1 lượt AI)" ở /bai-doc/[lessonId]
 *                                               → createReading() → AiToolsService.createReading()
 *                                               client: lib/reading.ts (key)
 */
@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiToolsController {
  constructor(private readonly ai: AiToolsService) {}

  @Get('usage')
  usage(@CurrentUser() user: AuthUser) {
    return this.ai.usage(user.id);
  }

  /** Mẹo nhớ theo âm Hán Việt cho 1 từ (đã có thì trả luôn, không tốn lượt). */
  @Post('mnemonic/:wordId')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  mnemonic(
    @CurrentUser() user: AuthUser,
    @Param('wordId', ParseUUIDPipe) wordId: string,
  ) {
    return this.ai.mnemonic(user.id, wordId);
  }

  @Post('sentence-check')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  checkSentence(@CurrentUser() user: AuthUser, @Body() dto: SentenceCheckDto) {
    return this.ai.checkSentence(user.id, dto.wordId, dto.sentence);
  }

  /** Tách đoạn văn theo từ điển (pinyin + Hán Việt từng từ) — không gọi AI, khách dùng được. */
  @Public()
  @Get('segment')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  segment(@Query() dto: SegmentQueryDto) {
    return this.ai.segment(dto.q);
  }

  @Post('analyze')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyze(@CurrentUser() user: AuthUser, @Body() dto: AnalyzeDto) {
    return this.ai.analyze(user.id, dto.text);
  }

  /** Bài đọc AI của 1 bài học — đã có thì khách cũng đọc được. */
  @Public()
  @Get('reading/:lessonId')
  reading(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.ai.reading(lessonId);
  }

  @Post('reading/:lessonId')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createReading(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.ai.createReading(user.id, lessonId);
  }
}
