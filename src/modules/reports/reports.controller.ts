import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (viết ngày 14/11/2026; thêm/sửa route thì sửa khối này cho khớp).
 * Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route. Quyền: [khách+] khách gọi được, đã đăng nhập thì server
 * biết là ai · [admin]. "mobile:" = file trong hanni-mobile/, "client:" = file trong hanni-client/.
 *
 * POST      /reports  [khách+]     Báo cáo nội dung AI, báo cáo người dùng, yêu cầu xoá tài khoản
 *                                  → create() → ReportsService.create()
 *                                  mobile: src/components/report-button.tsx (nút "Báo cáo" dưới nội dung AI, hồ sơ người dùng)
 *                                  client: components/legal/account-deletion-form.tsx (/chinh-sach-bao-mat#xoa-tai-khoan)
 * GET       /reports  [admin]      Danh sách báo cáo mới nhất — chỉ admin, gọi bằng curl, không có giao diện
 *                                  → list() → ReportsService.list()
 */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @OptionalAuth()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Post()
  create(@Body() dto: CreateReportDto, @CurrentUser() user?: AuthUser) {
    return this.reports.create(dto, user?.id ?? null);
  }

  @Roles('admin')
  @Get()
  list() {
    return this.reports.list();
  }
}
