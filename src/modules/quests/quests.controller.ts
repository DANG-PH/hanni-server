import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { QuestsService } from './quests.service';

@ApiTags('quests')
@ApiBearerAuth()
@Controller('quests')
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get('today')
  today(@CurrentUser() user: AuthUser) {
    return this.quests.getToday(user.id);
  }
}
