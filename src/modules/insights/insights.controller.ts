import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ReportQueryDto } from './dto/report-query.dto';
import { InsightsService } from './insights.service';

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
