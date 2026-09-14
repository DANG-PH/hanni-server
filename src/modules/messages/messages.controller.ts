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
import type { AuthUser } from '../../common/types';
import {
  MessagesPageQuery,
  SendMessageDto,
  TranslateMessageDto,
} from './dto/messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthUser) {
    return this.messages.listConversations(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.messages.unreadCount(user.id);
  }

  @Post('with/:userId')
  getOrCreateWith(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) otherUserId: string,
  ) {
    return this.messages.getOrCreateWith(user.id, otherUserId);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: MessagesPageQuery,
  ) {
    return this.messages.getMessages(user.id, id, q.page ?? 1);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendMessage(user.id, id, dto.content);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('translate')
  translate(@Body() dto: TranslateMessageDto) {
    return this.messages.translateText(dto.text);
  }

  @Post('conversations/:id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.messages.markRead(user.id, id);
  }
}
