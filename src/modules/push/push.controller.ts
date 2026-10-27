import { Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { SubscribeDto, UnsubscribeDto } from './dto/push.dto';
import { PushService } from './push.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /push/public-key  [đăng nhập]  Bật thông báo đẩy (dải mời ở /learn, thẻ Thông báo ở /settings) — lấy khoá
 *                                          VAPID
 *                                          → publicKey() → PushService.getPublicKey()
 *                                          client: lib/pwa/push.ts (subscribeToPush)
 * POST      /push/subscribe   [đăng nhập]  Bật thông báo đẩy trên thiết bị này (/learn, /settings)
 *                                          → subscribe() → PushService.subscribe()
 *                                          client: lib/pwa/push.ts (subscribeToPush)
 * DELETE    /push/subscribe   [đăng nhập]  Tắt thông báo đẩy ở /settings
 *                                          → unsubscribe() → PushService.unsubscribe()
 *                                          client: lib/pwa/push.ts (unsubscribeFromPush)
 * POST      /push/test        [đăng nhập]  Nút "Gửi thử" thông báo ở /settings
 *                                          → sendTest() → PushService.sendTest()
 *                                          client: lib/pwa/push.ts (sendTestPush)
 */
@ApiTags('push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  publicKey() {
    return this.push.getPublicKey();
  }

  @Post('subscribe')
  subscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeDto,
    @Req() req: Request,
  ) {
    return this.push.subscribe(user.id, dto, req.headers['user-agent']);
  }

  @Delete('subscribe')
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribeDto) {
    return this.push.unsubscribe(user.id, dto.endpoint);
  }

  @Post('test')
  sendTest(@CurrentUser() user: AuthUser) {
    return this.push.sendTest(user.id);
  }
}
