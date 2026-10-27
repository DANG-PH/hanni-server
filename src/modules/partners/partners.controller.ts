import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { CreatePartnerLeadDto } from './dto/partner-lead.dto';
import { PartnersService } from './partners.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * POST      /partners/leads  [khách+]     Form liên hệ cho trung tâm ở /hop-tac (Dành cho giáo viên)
 *                                         → create() → PartnersService.createLead()
 *                                         client: components/partners/partner-lead-form.tsx
 * GET       /partners/leads  [admin]      Danh sách liên hệ hợp tác — chỉ admin, gọi bằng curl, không có giao diện
 *                                         → list() → PartnersService.leads()
 */
@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @OptionalAuth()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('leads')
  create(@Body() dto: CreatePartnerLeadDto, @CurrentUser() user?: AuthUser) {
    return this.partners.createLead(dto, user?.id ?? null);
  }

  @Roles('admin')
  @Get('leads')
  list() {
    return this.partners.leads();
  }
}
