import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PremiumService } from './premium.service';

@ApiTags('premium')
@ApiBearerAuth()
@Controller('premium')
export class PremiumController {
  constructor(private readonly premium: PremiumService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.premium.getStatus(user.id);
  }
}
