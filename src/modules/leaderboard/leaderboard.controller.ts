import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import {
  LeaderboardService,
  type LeaderboardMetric,
} from './leaderboard.service';
import { LeagueService } from './league.service';

class LeaderboardQuery {
  @IsOptional()
  @IsIn(['learned', 'streak', 'longest', 'lessons'])
  metric?: LeaderboardMetric;
}

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /leaderboard/metrics  [khách+]     Các tab tiêu chí (Chuỗi hiện tại / Bài đã xong) ở /leaderboard
 *                                              → metrics() → LeaderboardService.metrics()
 *                                              client: lib/hooks.ts (useLeaderboardMetrics)
 * GET       /leaderboard/league   [đăng nhập]  Thẻ "Giải đấu tuần" đầu trang /leaderboard
 *                                              → myLeague() → LeagueService.getMyLeague()
 *                                              client: lib/hooks.ts (useWeeklyLeague)
 * GET       /leaderboard          [khách+]     Bảng xếp hạng (bục top 3 + bảng đầy đủ) ở /leaderboard
 *                                              → top() → LeaderboardService.top()
 *                                              client: lib/hooks.ts (useLeaderboard)
 */
@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboard: LeaderboardService,
    private readonly league: LeagueService,
  ) {}

  @OptionalAuth()
  @Get('metrics')
  metrics() {
    return this.leaderboard.metrics();
  }

  /** Giải đấu học tập theo tuần — xem league.service.ts. */
  @Get('league')
  myLeague(@CurrentUser() user: AuthUser) {
    return this.league.getMyLeague(user.id);
  }

  /** Khách xem được bảng chung; hạng của mình cần tài khoản. */
  @OptionalAuth()
  @Get()
  top(@CurrentUser() user: AuthUser | undefined, @Query() q: LeaderboardQuery) {
    return this.leaderboard.top(user?.id ?? null, q.metric ?? 'streak');
  }
}
