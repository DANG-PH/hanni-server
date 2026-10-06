import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { SubmitMockExamDto } from './dto/submit-mock-exam.dto';
import { MockExamsService } from './mock-exams.service';

/** Đề thi thử HSK đúng cấu trúc đề thật. Khách làm được (học trước, đăng ký
 * sau); người đăng nhập được lưu điểm + điểm cao nhất mỗi đề. */
@ApiTags('mock-exams')
@ApiBearerAuth()
@Controller('mock-exams')
export class MockExamsController {
  constructor(private readonly exams: MockExamsService) {}

  @OptionalAuth()
  @Get()
  list(@CurrentUser() user?: AuthUser) {
    return this.exams.list(user?.id);
  }

  @Get('attempts/me')
  history(@CurrentUser() user: AuthUser) {
    return this.exams.history(user.id);
  }

  @Public()
  @Get(':slug')
  paper(@Param('slug') slug: string) {
    return this.exams.paper(slug);
  }

  @OptionalAuth()
  @Post(':slug/submit')
  submit(
    @Param('slug') slug: string,
    @Body() dto: SubmitMockExamDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.exams.submit(slug, dto.answers, dto.durationSec, user?.id);
  }
}
