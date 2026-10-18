import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AiToolsService } from './ai-tools.service';
import { AnalyzeDto, SentenceCheckDto } from './dto/ai-tools.dto';

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

  @Post('analyze')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyze(@CurrentUser() user: AuthUser, @Body() dto: AnalyzeDto) {
    return this.ai.analyze(user.id, dto.text);
  }
}
