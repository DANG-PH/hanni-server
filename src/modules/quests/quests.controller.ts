import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { QuestsService } from './quests.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /quests/today  [đăng nhập]  Thẻ "Nhiệm vụ hôm nay" (3 nhiệm vụ, xong cả 3 → +1 lá chắn) ở /learn
 *                                       → today() → QuestsService.getToday()
 *                                       client: lib/hooks.ts (useTodayQuests)
 */
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
