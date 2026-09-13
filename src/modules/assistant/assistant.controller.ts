import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AssistantService } from './assistant.service';
import { AskAssistantDto } from './dto/ask-assistant.dto';

@ApiTags('assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.assistant.listSessions(user.id);
  }

  @Post('sessions')
  newSession(@CurrentUser() user: AuthUser) {
    return this.assistant.createSession(user.id);
  }

  @Get('sessions/:sessionId/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.assistant.getMessages(user.id, sessionId);
  }

  @Delete('sessions/:sessionId')
  deleteSession(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.assistant.deleteSession(user.id, sessionId);
  }

  // Throttle chỉ chặn spam từ 1 user — CHƯA giới hạn tổng quota Gemini free
  // tier khi nhiều user cùng dùng, xem TODO(scale) ở assistant.service.ts.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskAssistantDto) {
    return this.assistant.ask(user.id, dto.message, dto.sessionId);
  }

  // SSE (EventSource) chỉ hỗ trợ GET nên nhận message/sessionId qua query
  // thay vì body — message tối đa 1000 ký tự nên URL không quá dài.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Sse('ask/stream')
  askStream(
    @CurrentUser() user: AuthUser,
    @Query() dto: AskAssistantDto,
  ): Observable<MessageEvent> {
    return this.assistant.askStream(user.id, dto.message, dto.sessionId);
  }

  @Get('status')
  status() {
    return this.assistant.getStatus();
  }
}
