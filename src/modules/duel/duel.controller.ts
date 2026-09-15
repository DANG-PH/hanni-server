import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { DuelSeasonService } from './duel-season.service';
import { DuelService } from './duel.service';

@ApiTags('duel')
@ApiBearerAuth()
@Controller('duel')
export class DuelController {
  constructor(
    private readonly duel: DuelService,
    private readonly season: DuelSeasonService,
  ) {}

  @Get('rating/me')
  getMyRating(@CurrentUser() user: AuthUser) {
    return this.duel.getMyRating(user.id);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.duel.getLeaderboard();
  }

  @Get('season')
  getSeason() {
    return this.season.getSeasonInfo();
  }

  @Get('queue-size')
  getQueueSize() {
    return { size: this.duel.getQueueSize() };
  }

  /** Trận ĐANG DIỄN RA của mình, nếu có — FE gọi lúc mở trang minigame để tự
   * phục hồi UI nếu vừa refresh/mở lại giữa 1 trận đang đấu. */
  @Get('active')
  getActive(@CurrentUser() user: AuthUser) {
    return this.duel.getActiveMatchState(user.id);
  }
}
