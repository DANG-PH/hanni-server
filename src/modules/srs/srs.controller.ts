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
import {
  AddWordDto,
  QueueQueryDto,
  ReviewDto,
  StartSessionDto,
  SuspendWordDto,
} from './dto/srs.dto';
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

  @Get('leeches')
  leeches(@CurrentUser() user: AuthUser) {
    return this.reviews.getLeeches(user.id);
  }

  @Post('review')
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.reviews.review(user.id, dto);
  }

  @Get('suspended')
  suspended(@CurrentUser() user: AuthUser) {
    return this.reviews.getSuspended(user.id);
  }

  /** "Tôi biết từ này rồi" — ẩn khỏi mọi hàng đợi ôn, bỏ ẩn được bất cứ lúc
   * nào ở `/progress`. */
  @Post('words/:wordId/suspend')
  suspend(
    @CurrentUser() user: AuthUser,
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Body() dto: SuspendWordDto,
  ) {
    return this.reviews.setSuspended(user.id, wordId, dto.suspended);
  }

  @Post('add-word')
  addWord(@CurrentUser() user: AuthUser, @Body() dto: AddWordDto) {
    return this.reviews.addWord(user.id, dto.wordId);
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
