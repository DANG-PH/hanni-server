import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeagueService } from './league.service';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeagueService],
})
export class LeaderboardModule {}
