import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { CheckPracticeDto } from './dto/check-practice.dto';
import { SubmitMockExamDto } from './dto/submit-mock-exam.dto';
import { MockExamsService } from './mock-exams.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /mock-exams                 [khách+]     Danh sách đề thi thử /thi-thu-hsk; chọn đề khi giao bài ở
 *                                                    /lop-hoc/[id]
 *                                                    → list() → MockExamsService.list()
 *                                                    client: app/(app)/lop-hoc/[id]/page.tsx ·
 *                                                            app/(site)/hop-tac/page.tsx ·
 *                                                            app/(site)/thi-thu-hsk/page.tsx · app/sitemap.ts ·
 *                                                            components/mock-exam/exam-list.tsx
 * GET       /mock-exams/attempts/me     [đăng nhập]  Khối "Lịch sử làm bài" ở /thi-thu-hsk; việc "Làm thử 1 đề" ở thẻ
 *                                                    Bắt đầu với Hanni (/learn)
 *                                                    → history() → MockExamsService.history()
 *                                                    client: components/learn/getting-started.tsx ·
 *                                                            components/mock-exam/exam-list.tsx
 * GET       /mock-exams/analysis/me     [đăng nhập]  Khối "Phân tích điểm mạnh, yếu" ở /thi-thu-hsk
 *                                                    → analysis() → MockExamsService.analysis()
 *                                                    client: components/mock-exam/exam-list.tsx
 * GET       /mock-exams/practice        [khách]      Mục "Luyện từng dạng bài" dưới danh sách đề ở /thi-thu-hsk
 *                                                    → practiceList() → MockExamsService.practiceList()
 *                                                    client: app/(site)/thi-thu-hsk/dang-bai/[slug]/page.tsx ·
 *                                                            app/(site)/thi-thu-hsk/page.tsx · app/sitemap.ts
 * GET       /mock-exams/practice/:slug  [khách]      Trang luyện 1 dạng bài /thi-thu-hsk/dang-bai/[slug]
 *                                                    → practiceSet() → MockExamsService.practiceSet()
 *                                                    client: app/(site)/thi-thu-hsk/dang-bai/[slug]/page.tsx
 * POST      /mock-exams/practice/check  [khách]      Chọn đáp án ở /thi-thu-hsk/dang-bai/[slug] — chấm + chữa ngay
 *                                                    từng câu
 *                                                    → practiceCheck() → MockExamsService.practiceCheck()
 *                                                    client: components/mock-exam/practice-runner.tsx
 * GET       /mock-exams/:slug           [khách]      Phòng thi /thi-thu-hsk/[slug] — tải đề (KHÔNG kèm đáp án)
 *                                                    → paper() → MockExamsService.paper()
 *                                                    client: app/thi-thu-hsk/[slug]/page.tsx ·
 *                                                            components/mock-exam/exam-runner.tsx
 * POST      /mock-exams/:slug/submit    [khách+]     Nút "Nộp bài" ở phòng thi — server chấm điểm + trả chữa bài
 *                                                    → submit() → MockExamsService.submit()
 *                                                    client: components/mock-exam/exam-runner.tsx ·
 *                                                            lib/pending-lessons.ts (drainPendingExam)
 */
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

  @Get('analysis/me')
  analysis(@CurrentUser() user: AuthUser) {
    return this.exams.analysis(user.id);
  }

  /** Luyện từng dạng bài — khai báo TRƯỚC `:slug`, không thì "practice" bị
   * hiểu là slug đề. */
  @Public()
  @Get('practice')
  practiceList() {
    return this.exams.practiceList();
  }

  @Public()
  @Get('practice/:slug')
  practiceSet(@Param('slug') slug: string) {
    return this.exams.practiceSet(slug);
  }

  @Public()
  @Post('practice/check')
  practiceCheck(@Body() dto: CheckPracticeDto) {
    return this.exams.practiceCheck(dto.examSlug, dto.no, dto.answer);
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
