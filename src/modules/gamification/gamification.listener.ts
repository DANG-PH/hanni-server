import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AppEvent,
  type LevelCompletedPayload,
  type StreakUpdatedPayload,
  type WordReviewedPayload,
} from '../../events/events';
import { AchievementsService } from './achievements/achievements.service';
import { StreakService } from './streak/streak.service';

@Injectable()
export class GamificationListener {
  private readonly logger = new Logger(GamificationListener.name);

  constructor(
    private readonly streak: StreakService,
    private readonly achievements: AchievementsService,
  ) {}

  @OnEvent(AppEvent.WordReviewed, { async: true })
  async onWordReviewed(p: WordReviewedPayload): Promise<void> {
    try {
      await this.streak.recordActivity(p.userId, new Date(p.at), {
        wordsReviewed: 1,
        wordsLearned: p.becameLearned ? 1 : 0,
        minutesStudied: p.durationMs ? p.durationMs / 60_000 : 0,
      });
      await this.achievements.onWordReviewed(p.userId);
    } catch (err) {
      this.logger.error(`onWordReviewed: ${(err as Error).message}`);
    }
  }

  @OnEvent(AppEvent.StreakUpdated, { async: true })
  async onStreakUpdated(p: StreakUpdatedPayload): Promise<void> {
    try {
      await this.achievements.onStreakUpdated(p.userId, p.currentStreak);
    } catch (err) {
      this.logger.error(`onStreakUpdated: ${(err as Error).message}`);
    }
  }

  @OnEvent(AppEvent.LevelCompleted, { async: true })
  async onLevelCompleted(p: LevelCompletedPayload): Promise<void> {
    try {
      await this.achievements.onLevelCompleted(p.userId, p.hskLevel);
    } catch (err) {
      this.logger.error(`onLevelCompleted: ${(err as Error).message}`);
    }
  }
}
