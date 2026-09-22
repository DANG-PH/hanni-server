import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ReplyRoleplayDto, StartRoleplayDto } from './dto/roleplay.dto';
import { RoleplayService } from './roleplay.service';

@ApiTags('roleplay')
@ApiBearerAuth()
@Controller('roleplay')
export class RoleplayController {
  constructor(private readonly roleplay: RoleplayService) {}

  @Get('scenarios')
  scenarios() {
    return this.roleplay.listScenarios();
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.roleplay.listSessions(user.id);
  }

  @Get('sessions/:sessionId/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.roleplay.getMessages(user.id, sessionId);
  }

  @Post('sessions')
  start(@CurrentUser() user: AuthUser, @Body() dto: StartRoleplayDto) {
    return this.roleplay.startSession(user.id, dto.scenarioKey);
  }

  @Post('sessions/:sessionId/reply')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ReplyRoleplayDto,
  ) {
    return this.roleplay.reply(user.id, sessionId, dto.message);
  }

  @Post('sessions/:sessionId/hint')
  hint(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.roleplay.hint(user.id, sessionId);
  }

  /** Nhận xét ngắn sau buổi luyện — xem RoleplayService.feedback. */
  @Post('sessions/:sessionId/feedback')
  feedback(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.roleplay.feedback(user.id, sessionId);
  }

  @Delete('sessions/:sessionId')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    await this.roleplay.deleteSession(user.id, sessionId);
    return { ok: true };
  }
}
