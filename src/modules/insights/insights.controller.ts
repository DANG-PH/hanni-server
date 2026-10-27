import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ReportQueryDto } from './dto/report-query.dto';
import { InsightsService } from './insights.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /insights/report        [đăng nhập]  Khối báo cáo Tuần/Tháng/Quý + biểu đồ phút học ở /progress
 *                                                → report() → InsightsService.report()
 *                                                client: lib/insights.ts (useInsightsReport)
 * POST      /insights/report/coach  [đăng nhập]  Thẻ "Hanni Coach" (AI nhận xét, chỉ Premium) ở /progress
 *                                                → coach() → InsightsService.coach()
 *                                                client: lib/insights.ts (useCoach)
 */
@ApiTags('insights')
@ApiBearerAuth()
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  /** Báo cáo tuần/tháng/quý — số liệu của chính mình, ai cũng xem được. */
  @Get('report')
  report(@CurrentUser() user: AuthUser, @Query() q: ReportQueryDto) {
    return this.insights.report(user.id, q.period, q.offset);
  }

  /** Nhận xét của Hanni Coach (AI) — chỉ Premium. */
  @Post('report/coach')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  coach(@CurrentUser() user: AuthUser, @Body() dto: ReportQueryDto) {
    return this.insights.coach(user.id, dto.period, dto.offset);
  }
}
