import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/types';
import { CommentsService } from './comments.service';
import { CommentQueryDto, CreateCommentDto } from './comments.dto';

@ApiTags('videos')
@ApiBearerAuth()
@Controller('videos/:videoId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Query() q: CommentQueryDto,
  ) {
    return this.comments.list(videoId, q);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user.id, videoId, dto);
  }

  @Delete(':commentId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.comments.remove(user.id, videoId, commentId, user.role);
  }
}
