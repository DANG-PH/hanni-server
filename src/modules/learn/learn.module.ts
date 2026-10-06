import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { SrsModule } from '../srs/srs.module';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';
import { LessonSessionService } from './lesson-session.service';
import { PlacementService } from './placement.service';

@Module({
  imports: [SrsModule, GamificationModule],
  controllers: [LearnController],
  providers: [LearnService, LessonSessionService, PlacementService],
  exports: [LearnService],
})
export class LearnModule {}
