import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { MockExamsController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  imports: [GamificationModule],
  controllers: [MockExamsController],
  providers: [MockExamsService],
})
export class MockExamsModule {}
