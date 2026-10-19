import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { CreatePartnerLeadDto } from './dto/partner-lead.dto';
import { PartnersService } from './partners.service';

@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @OptionalAuth()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('leads')
  create(@Body() dto: CreatePartnerLeadDto, @CurrentUser() user?: AuthUser) {
    return this.partners.createLead(dto, user?.id ?? null);
  }

  @Roles('admin')
  @Get('leads')
  list() {
    return this.partners.leads();
  }
}
