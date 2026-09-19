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
import { CreatePremiumCheckoutDto, CreateTopUpDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('configured')
  configured() {
    return { configured: this.payments.isConfigured() };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('topup')
  createTopUp(@CurrentUser() user: AuthUser, @Body() dto: CreateTopUpDto) {
    return this.payments.createTopUp(user.id, dto.amountVnd);
  }

  @Get('topup/:orderCode')
  getStatus(
    @CurrentUser() user: AuthUser,
    @Param('orderCode', ParseIntPipe) orderCode: number,
  ) {
    return this.payments.getOrderStatus(user.id, orderCode);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.payments.getHistory(user.id);
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
