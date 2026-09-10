import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { FsrsScheduler } from './scheduler/fsrs.scheduler';
import { SchedulerRegistry } from './scheduler/scheduler.registry';
import { Sm2Scheduler } from './scheduler/sm2.scheduler';
import { SrsController } from './srs.controller';
import { StudySessionService } from './study-session.service';

@Module({
  controllers: [SrsController],
  providers: [
    ReviewService,
    StudySessionService,
    Sm2Scheduler,
    FsrsScheduler,
    SchedulerRegistry,
  ],
  exports: [ReviewService, StudySessionService],
})
export class SrsModule {}
