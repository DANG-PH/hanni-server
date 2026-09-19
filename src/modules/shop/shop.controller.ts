import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { EquipFrameDto } from './dto/equip-frame.dto';
import { ShopService } from './shop.service';

@ApiTags('shop')
@ApiBearerAuth()
@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

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
}
