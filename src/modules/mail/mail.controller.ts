import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MailService } from './mail.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /mail/configured  [đăng nhập]  Trang /settings hỏi máy chủ email đã cấu hình chưa (chưa thì ẩn mục email
 *                                          tuần)
 *                                          → configured()
 *                                          client: app/(app)/settings/page.tsx
 */
@ApiTags('mail')
@ApiBearerAuth()
@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  /** Client dùng để KHÔNG hứa suông: chưa cấu hình SMTP thì email tổng kết
   * tuần / đặt lại mật khẩu không bao giờ tới nơi, mà giao diện vẫn bày ra
   * như đang chạy. Cùng cách `/payments/configured` ẩn phần mua Premium khi chưa
   * có payOS. */
  @Get('configured')
  configured() {
    return { configured: this.mail.configured };
  }
}
