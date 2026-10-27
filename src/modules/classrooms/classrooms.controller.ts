import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { ClassroomsService } from './classrooms.service';
import {
  CreateAssignmentDto,
  CreateClassroomDto,
  UpdateClassroomDto,
} from './dto/classroom.dto';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * POST      /classrooms                                [đăng nhập]  Form "Tạo lớp" ở /lop-hoc
 *                                                                   → create() → ClassroomsService.create()
 *                                                                   client: lib/classrooms.ts (createClassroom)
 * GET       /classrooms/mine                           [đăng nhập]  Danh sách lớp tôi dạy / lớp tôi học ở /lop-hoc,
 *                                                                   thẻ Lớp học ở /account
 *                                                                   → mine() → ClassroomsService.mine()
 *                                                                   client: lib/classrooms.ts (useMyClassrooms)
 * GET       /classrooms/assignments/me                 [đăng nhập]  Thẻ "Bài tập của lớp" trên trang chủ /learn (bài
 *                                                                   giáo viên giao chưa làm)
 *                                                                   → myAssignments() →
 *                                                                     ClassroomsService.myAssignments()
 *                                                                   client: lib/classrooms.ts (useMyAssignments)
 * GET       /classrooms/code/:code                     [khách+]     Trang mời vào lớp /lop/[mã] — xem trước tên lớp +
 *                                                                   giáo viên (khách cũng xem được)
 *                                                                   → preview() → ClassroomsService.preview()
 *                                                                   client: lib/classrooms.ts (useClassPreview)
 * POST      /classrooms/code/:code/join                [đăng nhập]  Nút "Vào lớp" ở /lop/[mã] (hoặc ô nhập mã ở
 *                                                                   /lop-hoc, /account)
 *                                                                   → join() → ClassroomsService.join()
 *                                                                   client: lib/classrooms.ts (joinClassroom)
 * GET       /classrooms/:id                            [đăng nhập]  Trang 1 lớp /lop-hoc/[id] — giáo viên: bảng tiến
 *                                                                   độ học viên + bài giao; học viên: bài tập
 *                                                                   → detail() → ClassroomsService.detail()
 *                                                                   client: lib/classrooms.ts (useClassroom)
 * PATCH     /classrooms/:id                            [đăng nhập]  Đổi tên lớp — hàm renameClassroom có sẵn ở
 *                                                                   lib/classrooms.ts nhưng CHƯA có nút trên giao
 *                                                                   diện
 *                                                                   → update() → ClassroomsService.update()
 *                                                                   client: lib/classrooms.ts (renameClassroom)
 * DELETE    /classrooms/:id                            [đăng nhập]  Nút "Xoá lớp này" cuối trang /lop-hoc/[id] (giáo
 *                                                                   viên)
 *                                                                   → remove() → ClassroomsService.remove()
 *                                                                   client: lib/classrooms.ts (deleteClassroom)
 * POST      /classrooms/:id/leave                      [đăng nhập]  Nút "Rời lớp" ở /lop-hoc/[id] (học viên)
 *                                                                   → leave() → ClassroomsService.leave()
 *                                                                   client: lib/classrooms.ts (leaveClassroom)
 * DELETE    /classrooms/:id/members/:userId            [đăng nhập]  Nút xoá 1 học viên khỏi lớp ở bảng tiến độ
 *                                                                   /lop-hoc/[id] (giáo viên)
 *                                                                   → removeMember() →
 *                                                                     ClassroomsService.removeMember()
 *                                                                   client: lib/classrooms.ts (removeMember)
 * POST      /classrooms/:id/assignments                [đăng nhập]  Khối "Giao bài" ở /lop-hoc/[id] — chọn bài học
 *                                                                   hoặc đề thi + hạn nộp
 *                                                                   → addAssignment() →
 *                                                                     ClassroomsService.addAssignment()
 *                                                                   client: lib/classrooms.ts (addAssignment)
 * DELETE    /classrooms/:id/assignments/:assignmentId  [đăng nhập]  Nút xoá 1 bài đã giao ở /lop-hoc/[id]
 *                                                                   → removeAssignment() →
 *                                                                     ClassroomsService.removeAssignment()
 *                                                                   client: lib/classrooms.ts (removeAssignment)
 */
@ApiTags('classrooms')
@ApiBearerAuth()
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classrooms: ClassroomsService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClassroomDto) {
    return this.classrooms.create(user.id, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.classrooms.mine(user.id);
  }

  /** Khai báo TRƯỚC `:id` để không bị ParseUUIDPipe nuốt. */
  @Get('assignments/me')
  myAssignments(@CurrentUser() user: AuthUser) {
    return this.classrooms.myAssignments(user.id);
  }

  @OptionalAuth()
  @Get('code/:code')
  preview(@Param('code') code: string, @CurrentUser() user?: AuthUser) {
    return this.classrooms.preview(code, user?.id ?? null);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('code/:code/join')
  join(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.classrooms.join(code, user.id);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.classrooms.detail(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassroomDto,
  ) {
    return this.classrooms.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.classrooms.remove(id, user.id);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.classrooms.leave(id, user.id);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) memberId: string,
  ) {
    return this.classrooms.removeMember(id, user.id, memberId);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/assignments')
  addAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.classrooms.addAssignment(id, user.id, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  removeAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.classrooms.removeAssignment(id, user.id, assignmentId);
  }
}
