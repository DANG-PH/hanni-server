import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import {
  LeaderboardService,
  type LeaderboardMetric,
} from './leaderboard.service';

class LeaderboardQuery {
  @IsOptional()
  @IsIn(['learned', 'streak', 'longest', 'lessons'])
  metric?: LeaderboardMetric;
}

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get('metrics')
  metrics() {
    return this.leaderboard.metrics();
  }

  @Get()
  top(@CurrentUser() user: AuthUser, @Query() q: LeaderboardQuery) {
    return this.leaderboard.top(user.id, q.metric ?? 'learned');
  }
}
