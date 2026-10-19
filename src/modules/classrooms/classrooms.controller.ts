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
