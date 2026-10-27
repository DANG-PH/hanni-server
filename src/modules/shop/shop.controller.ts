import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { EquipTitleDto } from './dto/equip-title.dto';
import { TitleService } from './title.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /shop/titles        [đăng nhập]  Khối "Danh hiệu" ở /achievements (danh hiệu mở theo huy hiệu)
 *                                            → titleCatalog() → TitleService.getCatalog()
 *                                            client: lib/shop.ts (useTitleShop)
 * POST      /shop/titles/equip  [đăng nhập]  Bấm chọn 1 danh hiệu ở /achievements
 *                                            → equipTitle() → TitleService.equip()
 *                                            client: lib/shop.ts (equipTitle)
 */
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
