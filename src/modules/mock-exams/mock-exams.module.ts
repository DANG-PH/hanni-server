import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { ExamOutboxRelay } from './exam-outbox.relay';
import { MockExamsController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  imports: [GamificationModule],
  controllers: [MockExamsController],
  providers: [MockExamsService, ExamOutboxRelay],
})
export class MockExamsModule {}
