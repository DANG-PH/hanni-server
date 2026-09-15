import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GameMode } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import {
  FinishMinigameDto,
  LeaderboardQueryDto,
  StartMinigameDto,
} from './dto/minigame.dto';
import { MinigameService } from './minigame.service';

@ApiTags('minigame')
@ApiBearerAuth()
@Controller('minigame')
export class MinigameController {
  constructor(private readonly minigame: MinigameService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('start')
  start(@CurrentUser() user: AuthUser, @Body() dto: StartMinigameDto) {
    return this.minigame.start(user.id, dto.mode ?? GameMode.TRANSLATE);
  }

  @Post(':id/finish')
  finish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinishMinigameDto,
  ) {
    return this.minigame.finish(user.id, id, dto);
  }

  @Get('leaderboard')
  leaderboard(@Query() q: LeaderboardQueryDto) {
    return this.minigame.leaderboard(q.period, q.mode);
  }
}
