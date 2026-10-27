import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PracticeStatsQueryDto, RecordAttemptDto } from './dto/practice.dto';
import { PracticeService } from './practice.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * POST      /practice/attempts  [đăng nhập]  Mỗi lần kiểm tra đáp án ở /listening hoặc ghi âm xong ở /pronunciation
 *                                            → record() → PracticeService.record()
 *                                            client: lib/hooks.ts (recordPracticeAttempt)
 * GET       /practice/stats     [đăng nhập]  Thẻ thống kê lũy kế ở /listening, /pronunciation; việc "Chấm phát âm 1
 *                                            từ" ở /learn
 *                                            → stats() → PracticeService.stats()
 *                                            client: lib/hooks.ts (usePracticeStats)
 */
@ApiTags('practice')
@ApiBearerAuth()
@Controller('practice')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('attempts')
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordAttemptDto) {
    return this.practice.record(user.id, dto);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser, @Query() q: PracticeStatsQueryDto) {
    return this.practice.stats(user.id, q.skill);
  }
}
