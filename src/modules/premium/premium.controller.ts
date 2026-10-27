import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PremiumService } from './premium.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /premium/status  [đăng nhập]  Thẻ Premium ở /account, nút Premium ở chân menu, popup Premium
 *                                         → status() → PremiumService.getStatus()
 *                                         client: lib/premium.ts (usePremiumStatus)
 */
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
