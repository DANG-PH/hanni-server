import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PracticeStatsQueryDto, RecordAttemptDto } from './dto/practice.dto';
import { PracticeService } from './practice.service';

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
