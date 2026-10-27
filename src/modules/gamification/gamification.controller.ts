import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AchievementsService } from './achievements/achievements.service';
import { GenerateQuizDto, SubmitQuizDto } from './quiz/dto/quiz.dto';
import { QuizService } from './quiz/quiz.service';
import { StreakService } from './streak/streak.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /streak          [đăng nhập]  Chip chuỗi ngày 🔥 + số lá chắn trên thanh trên; thẻ chuỗi ngày ở /learn
 *                                         → getStreak() → StreakService.getStreak()
 *                                         client: components/lesson-session/session-runner.tsx · lib/hooks.ts
 *                                                 (useStreak)
 * GET       /streak/history  [đăng nhập]  Dải tuần T2–CN ở thẻ chuỗi ngày /learn; lịch hoạt động 30 ngày ở /progress
 *                                         → streakHistory() → StreakService.history()
 *                                         client: lib/hooks.ts (useStreakHistory)
 * GET       /achievements    [đăng nhập]  Lưới huy chương ở /achievements
 *                                         → listAchievements() → AchievementsService.list()
 *                                         client: lib/hooks.ts (useAchievements)
 * POST      /quiz/generate   [đăng nhập]  Quiz cuối buổi ôn flashcard ở /study (sinh câu nghe + đọc từ các từ vừa ôn)
 *                                         → generateQuiz() → QuizService.generate()
 *                                         client: app/(app)/study/page.tsx
 * POST      /quiz/submit     [đăng nhập]  Nộp quiz cuối buổi ôn ở /study
 *                                         → submitQuiz() → QuizService.submit()
 *                                         client: components/quiz-runner.tsx
 * GET       /quiz/recent     [đăng nhập]  Lịch sử quiz gần đây ở /progress
 *                                         → recentQuizzes() → QuizService.recent()
 *                                         client: lib/hooks.ts (useRecentQuizzes)
 */
@ApiTags('gamification')
@ApiBearerAuth()
@Controller()
export class GamificationController {
  constructor(
    private readonly streak: StreakService,
    private readonly achievements: AchievementsService,
    private readonly quiz: QuizService,
  ) {}

  @Get('streak')
  getStreak(@CurrentUser() user: AuthUser) {
    return this.streak.getStreak(user.id);
  }

  @Get('streak/history')
  streakHistory(
    @CurrentUser() user: AuthUser,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.streak.history(user.id, Math.min(days, 366));
  }

  @Get('achievements')
  listAchievements(@CurrentUser() user: AuthUser) {
    return this.achievements.list(user.id);
  }

  @Post('quiz/generate')
  generateQuiz(@CurrentUser() user: AuthUser, @Body() dto: GenerateQuizDto) {
    return this.quiz.generate(user.id, dto);
  }

  @Post('quiz/submit')
  submitQuiz(@CurrentUser() user: AuthUser, @Body() dto: SubmitQuizDto) {
    return this.quiz.submit(user.id, dto);
  }

  @Get('quiz/recent')
  recentQuizzes(@CurrentUser() user: AuthUser) {
    return this.quiz.recent(user.id);
  }
}
