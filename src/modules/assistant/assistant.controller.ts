import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
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

  @Get('messages')
  messages(@CurrentUser() user: AuthUser) {
    return this.assistant.getMessages(user.id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskAssistantDto) {
    return this.assistant.ask(user.id, dto.message);
  }

  @Delete('session')
  clearSession(@CurrentUser() user: AuthUser) {
    return this.assistant.clearSession(user.id);
  }

  @Get('status')
  status() {
    return this.assistant.getStatus();
  }
}
