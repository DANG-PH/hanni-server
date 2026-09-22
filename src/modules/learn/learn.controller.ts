import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { LearnService } from './learn.service';

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
  constructor(private readonly learn: LearnService) {}

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
