import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GameMode } from '../../database/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import {
  FinishMinigameDto,
  LeaderboardQueryDto,
  StartMinigameDto,
} from './dto/minigame.dto';
import { MinigameService } from './minigame.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * POST      /minigame/start        [khách+]     Nút "Bắt đầu chơi" ở /minigame (Dịch tốc độ / Nghe đoán từ / Ghép cặp
 *                                               / Chọn pinyin)
 *                                               → start() → MinigameService.start()
 *                                               client: lib/minigame.ts (startMinigame)
 * POST      /minigame/:id/finish   [khách+]     Hết ván ở /minigame — server tự chấm theo đáp án đã lưu lúc bắt đầu
 *                                               → finish() → MinigameService.finish()
 *                                               client: lib/minigame.ts (finishMatchMinigame) · lib/minigame.ts
 *                                                       (finishMinigame)
 * GET       /minigame/leaderboard  [khách]      Bảng xếp hạng ngày/tuần của từng trò ở /minigame
 *                                               → leaderboard() → MinigameService.leaderboard()
 *                                               client: lib/minigame.ts (useMinigameLeaderboard)
 */
@ApiTags('minigame')
@ApiBearerAuth()
@Controller('minigame')
export class MinigameController {
  constructor(private readonly minigame: MinigameService) {}

  /** Khách chơi được (lượt chơi giữ tạm, không lên bảng xếp hạng) — xem `MinigameService.saveSession`. */
  @OptionalAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('start')
  start(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: StartMinigameDto,
  ) {
    return this.minigame.start(
      user?.id ?? null,
      dto.mode ?? GameMode.TRANSLATE,
    );
  }

  @OptionalAuth()
  @Post(':id/finish')
  finish(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinishMinigameDto,
  ) {
    return this.minigame.finish(user?.id ?? null, id, dto);
  }

  @Public()
  @Get('leaderboard')
  leaderboard(@Query() q: LeaderboardQueryDto) {
    return this.minigame.leaderboard(q.period, q.mode);
  }
}
