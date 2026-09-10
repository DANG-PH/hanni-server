import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements/achievements.service';
import { GamificationController } from './gamification.controller';
import { GamificationListener } from './gamification.listener';
import { QuizService } from './quiz/quiz.service';
import { StreakService } from './streak/streak.service';

@Module({
  controllers: [GamificationController],
  providers: [
    StreakService,
    AchievementsService,
    QuizService,
    GamificationListener,
  ],
  exports: [StreakService, AchievementsService, QuizService],
})
export class GamificationModule {}
