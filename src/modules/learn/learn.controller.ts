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

  @Get('lessons/:id')
  lesson(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learn.lesson(user.id, id);
  }
}
