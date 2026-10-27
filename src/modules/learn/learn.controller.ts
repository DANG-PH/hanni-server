import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { CompleteLessonDto } from './dto/lesson-session.dto';
import { LearnService } from './learn.service';
import { LessonSessionService } from './lesson-session.service';
import { PlacementService } from './placement.service';

class PathQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;
}

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /learn/start                 [khách]      Nút "Học bài đầu tiên" (trang chủ /) → /bat-dau tra bài 1 của
 *                                                     cấp
 *                                                     → start() → LearnService.firstLesson()
 *                                                     client: app/bat-dau/page.tsx
 * GET       /learn/placement             [khách]      Bài kiểm tra trình độ /kiem-tra-trinh-do — tải cả đề 1 lần
 *                                                     → placement() → PlacementService.questions()
 *                                                     client: components/placement-test.tsx
 * GET       /learn/lessons/:id/session   [khách]      Phiên học 1 bài /bai-hoc/[id] — server dựng sẵn mọi bước (giới
 *                                                     thiệu từ → trắc nghiệm → ghép cặp → điền câu)
 *                                                     → session() → LessonSessionService.session()
 *                                                     client: app/bai-hoc/[lessonId]/page.tsx
 * POST      /learn/lessons/:id/complete  [đăng nhập]  Màn "Hoàn thành bài" ở /bai-hoc/[id] — đưa từ vừa học vào lịch
 *                                                     ôn SRS (khách: nộp sau khi đăng ký)
 *                                                     → complete() → LessonSessionService.complete()
 *                                                     client: components/lesson-session/session-runner.tsx ·
 *                                                             lib/pending-lessons.ts (drainPendingLessons)
 * GET       /learn/path                  [khách+]     Thẻ "Học tiếp" + lộ trình chủ đề ở trang chủ /learn; chọn bài
 *                                                     khi giao bài ở /lop-hoc/[id]
 *                                                     → path() → LearnService.path()
 *                                                     client: app/(site)/tu-dien/page.tsx · lib/hooks.ts
 *                                                             (preloadLearnHome) · lib/hooks.ts (useLearnPath)
 * GET       /learn/current               [đăng nhập]  "Bài đang học" để luyện nghe / phát âm / viết / ôn tập mặc định
 *                                                     bám đúng bài đó
 *                                                     → current() → LearnService.currentLesson()
 *                                                     client: lib/hooks.ts (useCurrentLesson)
 * GET       /learn/lessons/:id           [khách+]     Trang chi tiết bài /learn/[id] (danh sách từ, ngữ pháp liên
 *                                                     quan); từ của bài ở khung chủ đề
 *                                                     → lesson() → LearnService.lesson()
 *                                                     client: app/(app)/study/page.tsx · lib/hooks.ts (useLesson)
 */
@ApiTags('learn')
@ApiBearerAuth()
@Controller('learn')
export class LearnController {
  constructor(
    private readonly learn: LearnService,
    private readonly sessions: LessonSessionService,
    private readonly placementTest: PlacementService,
  ) {}

  /** Bài ĐẦU TIÊN của 1 cấp — nút "Học bài đầu tiên" ở trang chủ/khảo sát
   * đưa khách vào thẳng phiên học, không qua đăng ký. */
  @Public()
  @Get('start')
  start(@Query() q: PathQuery) {
    return this.learn.firstLesson(q.level ?? 1);
  }

  /** Đề kiểm tra trình độ đầu vào (mỗi cấp vài câu, client hỏi dần từ HSK1
   * lên). Công khai — khách làm được trước khi có tài khoản. */
  @Public()
  @Get('placement')
  placement() {
    return this.placementTest.questions();
  }

  /** Kế hoạch phiên học của 1 bài (giới thiệu từ → luyện → ôn trộn). Công
   * khai để khách học thử bài đầu tiên trước khi có tài khoản. */
  @Public()
  @Get('lessons/:id/session')
  session(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.session(id);
  }

  @Post('lessons/:id/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.sessions.complete(user.id, id, dto);
  }

  /** Khách xem được lộ trình + từ của từng bài (như Hanzii/Hanbeego), học
   * được luôn qua `/bai-hoc`; tiến độ chỉ có khi đã đăng nhập. */
  @OptionalAuth()
  @Get('path')
  path(@CurrentUser() user: AuthUser | undefined, @Query() q: PathQuery) {
    return this.learn.path(user?.id ?? null, q.level);
  }

  /** Bài đang học dở — để các trang luyện tập mặc định luyện đúng chủ đề
   * người dùng đang theo, thay vì mỗi trang tự lấy ngẫu nhiên theo cấp. */
  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.learn.currentLesson(user.id);
  }

  @OptionalAuth()
  @Get('lessons/:id')
  lesson(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learn.lesson(user?.id ?? null, id);
  }
}
