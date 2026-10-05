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
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { CompleteLessonDto } from './dto/lesson-session.dto';
import { LearnService } from './learn.service';
import { LessonSessionService } from './lesson-session.service';

class PathQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;
}

@ApiTags('learn')
@ApiBearerAuth()
@Controller('learn')
export class LearnController {
  constructor(
    private readonly learn: LearnService,
    private readonly sessions: LessonSessionService,
  ) {}

  /** Bài ĐẦU TIÊN của 1 cấp — nút "Học bài đầu tiên" ở trang chủ/khảo sát
   * đưa khách vào thẳng phiên học, không qua đăng ký. */
  @Public()
  @Get('start')
  start(@Query() q: PathQuery) {
    return this.learn.firstLesson(q.level ?? 1);
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

  @Get('path')
  path(@CurrentUser() user: AuthUser, @Query() q: PathQuery) {
    return this.learn.path(user.id, q.level);
  }

  /** Bài đang học dở — để các trang luyện tập mặc định luyện đúng chủ đề
   * người dùng đang theo, thay vì mỗi trang tự lấy ngẫu nhiên theo cấp. */
  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.learn.currentLesson(user.id);
  }

  @Get('lessons/:id')
  lesson(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learn.lesson(user.id, id);
  }
}
