import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { SubmitOnboardingDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /onboarding          [đăng nhập]  Khảo sát đầu vào /onboarding — đọc câu trả lời cũ (đã đăng nhập)
 *                                             → get() → OnboardingService.get()
 *                                             client: lib/hooks.ts (useOnboarding)
 * POST      /onboarding/preview  [khách]      Khách làm xong khảo sát /onboarding → xem lộ trình đề xuất KHÔNG lưu
 *                                             → preview() → OnboardingService.preview()
 *                                             client: lib/hooks.ts (previewOnboarding)
 * POST      /onboarding          [đăng nhập]  Người đã đăng nhập nộp khảo sát /onboarding (khách: nộp tự động sau khi
 *                                             đăng ký)
 *                                             → submit() → OnboardingService.submit()
 *                                             client: lib/hooks.ts (submitOnboarding)
 */
@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.onboarding.get(user.id);
  }

  /** Xem trước lộ trình khi CHƯA có tài khoản — xem OnboardingService.preview. */
  @Public()
  @Post('preview')
  preview(@Body() dto: SubmitOnboardingDto) {
    return this.onboarding.preview(dto);
  }

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitOnboardingDto) {
    return this.onboarding.submit(user.id, dto);
  }
}
