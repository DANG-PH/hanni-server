import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { TeamDuelService } from './team-duel.service';

/** Rating/leaderboard/rank-tiers dùng CHUNG với đấu 1v1 (`DuelController`)
 * — 2v2 chỉ cần thêm phần hàng đợi + trận đang diễn ra. */
@ApiTags('team-duel')
@ApiBearerAuth()
@Controller('teamduel')
export class TeamDuelController {
  constructor(private readonly teamDuel: TeamDuelService) {}

  @Get('queue-size')
  getQueueSize() {
    return { size: this.teamDuel.getQueueSize() };
  }

  @Get('active')
  getActive(@CurrentUser() user: AuthUser) {
    return this.teamDuel.getActiveMatchState(user.id);
  }
}
