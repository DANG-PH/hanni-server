import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Module({
  imports: [GamificationModule],
  controllers: [QuestsController],
  providers: [QuestsService],
})
export class QuestsModule {}
