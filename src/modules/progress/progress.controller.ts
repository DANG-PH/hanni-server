import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.progress.overview(user.id);
  }

  @Get('levels/:level')
  level(
    @CurrentUser() user: AuthUser,
    @Param('level', ParseIntPipe) level: number,
  ) {
    return this.progress.levelDetail(user.id, level);
  }
}
