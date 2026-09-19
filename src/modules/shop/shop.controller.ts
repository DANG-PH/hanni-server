import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { EquipFrameDto } from './dto/equip-frame.dto';
import { EquipTitleDto } from './dto/equip-title.dto';
import { ShopService } from './shop.service';
import { TitleService } from './title.service';

@ApiTags('shop')
@ApiBearerAuth()
@Controller('shop')
export class ShopController {
  constructor(
    private readonly shop: ShopService,
    private readonly titles: TitleService,
  ) {}

  @Get('frames')
  catalog(@CurrentUser() user: AuthUser) {
    return this.shop.getCatalog(user.id);
  }

  @Post('frames/:key/buy')
  buy(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.shop.buy(user.id, key);
  }

  @Post('frames/equip')
  equip(@CurrentUser() user: AuthUser, @Body() dto: EquipFrameDto) {
    return this.shop.equip(user.id, dto.frameKey ?? null);
  }

  @Get('titles')
  titleCatalog(@CurrentUser() user: AuthUser) {
    return this.titles.getCatalog(user.id);
  }

  @Post('titles/:key/buy')
  buyTitle(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.titles.buy(user.id, key);
  }

  @Post('titles/equip')
  equipTitle(@CurrentUser() user: AuthUser, @Body() dto: EquipTitleDto) {
    return this.titles.equip(user.id, dto.titleKey ?? null);
  }
}
