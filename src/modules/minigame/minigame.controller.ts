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
import { GameMode } from '../../database/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
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

  /** Khách chơi được (lượt chơi giữ tạm, không xu) — xem `MinigameService.saveSession`. */
  @OptionalAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('start')
  start(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: StartMinigameDto,
  ) {
    return this.minigame.start(
      user?.id ?? null,
      dto.mode ?? GameMode.TRANSLATE,
    );
  }

  @OptionalAuth()
  @Post(':id/finish')
  finish(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinishMinigameDto,
  ) {
    return this.minigame.finish(user?.id ?? null, id, dto);
  }

  @Public()
  @Get('leaderboard')
  leaderboard(@Query() q: LeaderboardQueryDto) {
    return this.minigame.leaderboard(q.period, q.mode);
  }
}
