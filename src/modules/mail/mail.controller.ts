import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MailService } from './mail.service';

@ApiTags('mail')
@ApiBearerAuth()
@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  /** Client dùng để KHÔNG hứa suông: chưa cấu hình SMTP thì email tổng kết
   * tuần / đặt lại mật khẩu không bao giờ tới nơi, mà giao diện vẫn bày ra
   * như đang chạy. Cùng cách `/payments/configured` ẩn phần nạp xu khi chưa
   * có payOS. */
  @Get('configured')
  configured() {
    return { configured: this.mail.configured };
  }
}
