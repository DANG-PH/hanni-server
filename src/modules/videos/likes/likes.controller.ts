import { Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/types';
import { LikesService } from './likes.service';

@ApiTags('videos')
@ApiBearerAuth()
@Controller('videos/:videoId/like')
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  like(
    @CurrentUser() user: AuthUser,
    @Param('videoId', ParseUUIDPipe) videoId: string,
  ) {
    return this.likes.like(user.id, videoId);
  }

  @Delete()
  unlike(
    @CurrentUser() user: AuthUser,
    @Param('videoId', ParseUUIDPipe) videoId: string,
  ) {
    return this.likes.unlike(user.id, videoId);
  }
}
