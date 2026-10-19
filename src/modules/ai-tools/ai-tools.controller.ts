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
