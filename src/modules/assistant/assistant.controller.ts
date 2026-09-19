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

  // Đã bỏ @Throttle theo yêu cầu (chặn cả lúc test lẫn dùng thật) — giới hạn
  // spam ngắn hạn giờ không còn, nhưng `AssistantService.checkDailyAskQuota()`
  // đã chặn LẠM DỤNG DÀI HẠN qua hạn mức lượt hỏi/ngày cho user miễn phí
  // (Premium không giới hạn), xem TODO(scale) ở assistant.service.ts.
  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskAssistantDto) {
    return this.assistant.ask(user.id, dto.message, dto.sessionId);
  }

  // SSE (EventSource) chỉ hỗ trợ GET nên nhận message/sessionId qua query
  // thay vì body — message tối đa 1000 ký tự nên URL không quá dài.
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
