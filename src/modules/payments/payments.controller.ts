import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Webhook } from '@payos/node/lib/resources/webhooks/webhook';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { CreatePremiumCheckoutDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /payments/configured         [đăng nhập]  Popup Premium hỏi payOS đã cấu hình chưa (chưa thì nút hiện
 *                                                     "Sắp mở bán")
 *                                                     → configured() → PaymentsService.isConfigured()
 *                                                     client: lib/payments.ts (usePaymentsConfigured)
 * GET       /payments/orders/:orderCode  [đăng nhập]  Quay về /account?premium=<mã> sau khi thanh toán → hiện "Nâng
 *                                                     cấp thành công"
 *                                                     → getStatus() → PaymentsService.getOrderStatus()
 *                                                     client: lib/payments.ts (getOrderStatus)
 * POST      /payments/premium-checkout   [đăng nhập]  Nút thanh toán ở bước 2 popup Premium → chuyển sang trang thanh
 *                                                     toán payOS
 *                                                     → createPremiumCheckout() →
 *                                                       PaymentsService.createPremiumCheckout()
 *                                                     client: lib/payments.ts (createPremiumCheckout)
 * POST      /payments/webhook/payos      [khách]      Không phải giao diện: MÁY CHỦ payOS gọi khi tiền đã về → cộng
 *                                                     hạn Premium
 *                                                     → webhook() → PaymentsService.handleWebhook()
 */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('configured')
  configured() {
    return { configured: this.payments.isConfigured() };
  }

  /** Trạng thái 1 đơn — trang /account đọc sau khi payOS đưa người dùng quay về. */
  @Get('orders/:orderCode')
  getStatus(
    @CurrentUser() user: AuthUser,
    @Param('orderCode', ParseIntPipe) orderCode: number,
  ) {
    return this.payments.getOrderStatus(user.id, orderCode);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('premium-checkout')
  createPremiumCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePremiumCheckoutDto,
  ) {
    return this.payments.createPremiumCheckout(user.id, dto.planKey);
  }

  /** payOS gọi thẳng endpoint này từ máy chủ của họ — không có cookie đăng
   * nhập của Hanni nên phải @Public(); xác thực thật sự nằm ở
   * `handleWebhook()` qua chữ ký HMAC, không phải qua JwtAuthGuard.
   * CỐ Ý dùng interface `Webhook` của SDK thay vì DTO class-validator (khác
   * quy ước chung của dự án) — `ValidationPipe` toàn cục bật `whitelist:
   * true`, nếu khai DTO thiếu field so với payload payOS gửi thật thì
   * `class-transformer` sẽ ÂM THẦM CẮT BỚT field trước khi tới
   * `webhooks.verify()`, có nguy cơ làm sai lệch dữ liệu chữ ký HMAC được
   * tính trên — rủi ro làm HỎNG xác thực payload thật còn nguy hiểm hơn
   * việc thiếu validate hình thức (đằng nào cũng bị chặn bởi verify() nếu
   * giả mạo). Giữ nguyên interface cho tới khi có tài khoản payOS thật để
   * kiểm chứng đủ field trước khi đổi. */
  @Public()
  @HttpCode(200)
  @Post('webhook/payos')
  async webhook(@Body() payload: Webhook) {
    await this.payments.handleWebhook(payload);
    return { received: true };
  }
}
