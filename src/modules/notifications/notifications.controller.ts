import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { NotificationQueryDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /notifications           [đăng nhập]  Chuông thông báo trên thanh trên (mọi trang trong app)
 *                                                 → list() → NotificationsService.list()
 *                                                 client: lib/notifications.ts (NOTIFICATIONS_KEY)
 * PATCH     /notifications/:id/read  [đăng nhập]  Bấm 1 thông báo trong chuông → đánh dấu đã đọc
 *                                                 → markRead() → NotificationsService.markRead()
 *                                                 client: lib/notifications.ts (markNotificationsRead)
 * POST      /notifications/read-all  [đăng nhập]  Nút "Đánh dấu đã đọc tất cả" trong chuông
 *                                                 → markAllRead() → NotificationsService.markAllRead()
 *                                                 client: lib/notifications.ts (markAllNotificationsRead)
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: NotificationQueryDto) {
    return this.notifications.list(user.id, q);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}
