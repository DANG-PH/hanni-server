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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { QueueQueryDto, ReviewDto, StartSessionDto } from './dto/srs.dto';
import { ReviewService } from './review.service';
import { StudySessionService } from './study-session.service';

@ApiTags('study')
@ApiBearerAuth()
@Controller('study')
export class SrsController {
  constructor(
    private readonly reviews: ReviewService,
    private readonly sessions: StudySessionService,
  ) {}

  @Get('queue')
  queue(@CurrentUser() user: AuthUser, @Query() query: QueueQueryDto) {
    return this.reviews.getQueue(user.id, query);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.reviews.getStats(user.id);
  }

  @Post('review')
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.reviews.review(user.id, dto);
  }

  @Post('session')
  startSession(@CurrentUser() user: AuthUser, @Body() dto: StartSessionDto) {
    return this.sessions.start(user.id, dto.source);
  }

  @Post('session/:id/end')
  endSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessions.end(user.id, id);
  }
}
