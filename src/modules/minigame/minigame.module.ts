import { Module } from '@nestjs/common';
import { MinigameController } from './minigame.controller';
import { MinigameService } from './minigame.service';

@Module({
  controllers: [MinigameController],
  providers: [MinigameService],
})
export class MinigameModule {}
