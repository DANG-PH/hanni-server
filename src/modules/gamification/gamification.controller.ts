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
