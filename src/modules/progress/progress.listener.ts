import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AppEvent,
  type LevelCompletedPayload,
  type WordReviewedPayload,
} from '../../events/events';
import { ProgressService } from './progress.service';

@Injectable()
export class ProgressListener {
  private readonly logger = new Logger(ProgressListener.name);

  constructor(
    private readonly progress: ProgressService,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(AppEvent.WordReviewed, { async: true })
  async onWordReviewed(payload: WordReviewedPayload): Promise<void> {
    try {
      const { justCompleted } = await this.progress.recomputeLevelCache(
        payload.userId,
        payload.hskLevel,
      );
      if (justCompleted) {
        const done: LevelCompletedPayload = {
          userId: payload.userId,
          hskLevel: payload.hskLevel,
        };
        this.events.emit(AppEvent.LevelCompleted, done);
      }
    } catch (err) {
      this.logger.error(
        `Cập nhật tiến độ cấp ${payload.hskLevel} thất bại: ${
          (err as Error).message
        }`,
      );
    }
  }
}
