import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import {
  LeaderboardService,
  type LeaderboardMetric,
} from './leaderboard.service';
import { LeagueService } from './league.service';

class LeaderboardQuery {
  @IsOptional()
  @IsIn(['learned', 'streak', 'longest', 'lessons'])
  metric?: LeaderboardMetric;

  @IsOptional()
  @IsIn(['global', 'friends'])
  scope?: 'global' | 'friends';
}

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboard: LeaderboardService,
    private readonly league: LeagueService,
  ) {}

  @OptionalAuth()
  @Get('metrics')
  metrics() {
    return this.leaderboard.metrics();
  }

  /** Giải đấu học tập theo tuần — khác ELO đấu 1v1, xem league.service.ts. */
  @Get('league')
  myLeague(@CurrentUser() user: AuthUser) {
    return this.league.getMyLeague(user.id);
  }

  /** Khách xem được bảng chung; "So với bạn bè" + hạng của mình cần tài khoản. */
  @OptionalAuth()
  @Get()
  top(@CurrentUser() user: AuthUser | undefined, @Query() q: LeaderboardQuery) {
    return this.leaderboard.top(
      user?.id ?? null,
      q.metric ?? 'learned',
      q.scope === 'friends' ? 10 : 50,
      q.scope ?? 'global',
    );
  }
}
