import { Body, Controller, Get, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ExamsService } from './exams.service';

class SaveAttemptDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  hskLevel!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  totalCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  correctCount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86400)
  durationSec?: number;
}

@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Post('attempts')
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveAttemptDto) {
    return this.exams.save(user.id, dto);
  }

  @Get('attempts')
  history(@CurrentUser() user: AuthUser) {
    return this.exams.history(user.id);
  }
}
