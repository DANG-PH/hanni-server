import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskAssistantDto) {
    return this.assistant.ask(user.id, dto.message, dto.sessionId);
  }

  @Get('status')
  status() {
    return this.assistant.getStatus();
  }
}
