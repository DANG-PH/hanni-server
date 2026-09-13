import { Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/types';
import { FollowsService } from './follows.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/:userId/follow')
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  follow(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) targetId: string,
  ) {
    return this.follows.follow(user.id, targetId);
  }

  @Delete()
  unfollow(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) targetId: string,
  ) {
    return this.follows.unfollow(user.id, targetId);
  }
}
