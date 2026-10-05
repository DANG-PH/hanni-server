import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { SrsModule } from '../srs/srs.module';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';
import { LessonSessionService } from './lesson-session.service';

@Module({
  imports: [SrsModule, GamificationModule],
  controllers: [LearnController],
  providers: [LearnService, LessonSessionService],
  exports: [LearnService],
})
export class LearnModule {}
