import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [GamificationModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
