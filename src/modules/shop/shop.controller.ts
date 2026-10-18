import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { EquipTitleDto } from './dto/equip-title.dto';
import { TitleService } from './title.service';

@ApiTags('shop')
@ApiBearerAuth()
@Controller('shop')
export class ShopController {
  constructor(private readonly titles: TitleService) {}

  @Get('titles')
  titleCatalog(@CurrentUser() user: AuthUser) {
    return this.titles.getCatalog(user.id);
  }

  @Post('titles/equip')
  equipTitle(@CurrentUser() user: AuthUser, @Body() dto: EquipTitleDto) {
    return this.titles.equip(user.id, dto.titleKey ?? null);
  }
}
