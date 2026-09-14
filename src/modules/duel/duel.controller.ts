import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { DuelService } from './duel.service';

@ApiTags('duel')
@ApiBearerAuth()
@Controller('duel')
export class DuelController {
  constructor(private readonly duel: DuelService) {}

  @Get('rating/me')
  getMyRating(@CurrentUser() user: AuthUser) {
    return this.duel.getMyRating(user.id);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.duel.getLeaderboard();
  }
}
