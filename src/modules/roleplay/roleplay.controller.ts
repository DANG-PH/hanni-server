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

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /roleplay/scenarios                     [đăng nhập]  Lưới 6 tình huống ở /roleplay
 *                                                                → scenarios() → RoleplayService.listScenarios()
 *                                                                client: lib/roleplay.ts (useRoleplayScenarios)
 * GET       /roleplay/sessions                      [đăng nhập]  Danh sách hội thoại gần đây ở /roleplay
 *                                                                → sessions() → RoleplayService.listSessions()
 *                                                                client: lib/roleplay.ts (useRoleplaySessions)
 * GET       /roleplay/sessions/:sessionId/messages  [đăng nhập]  Mở lại 1 hội thoại luyện nói ở /roleplay
 *                                                                → messages() → RoleplayService.getMessages()
 *                                                                client: lib/roleplay.ts (useRoleplayMessages)
 * POST      /roleplay/sessions                      [đăng nhập]  Chọn 1 tình huống ở /roleplay → bắt đầu hội thoại
 *                                                                → start() → RoleplayService.startSession()
 *                                                                client: lib/roleplay.ts (startRoleplaySession)
 * POST      /roleplay/sessions/:sessionId/reply     [đăng nhập]  Gửi câu (gõ hoặc nói qua micro) trong hội thoại
 *                                                                /roleplay
 *                                                                → reply() → RoleplayService.reply()
 *                                                                client: lib/roleplay.ts (replyRoleplay)
 * POST      /roleplay/sessions/:sessionId/hint      [đăng nhập]  Nút "Gợi ý" cạnh ô nhập ở /roleplay
 *                                                                → hint() → RoleplayService.hint()
 *                                                                client: lib/roleplay.ts (hintRoleplay)
 * POST      /roleplay/sessions/:sessionId/feedback  [đăng nhập]  Nút "Kết thúc" ở /roleplay → AI nhận xét buổi luyện
 *                                                                → feedback() → RoleplayService.feedback()
 *                                                                client: lib/roleplay.ts (feedbackRoleplay)
 * DELETE    /roleplay/sessions/:sessionId           [đăng nhập]  Nút "Đóng buổi luyện" sau màn nhận xét ở /roleplay
 *                                                                → remove() → RoleplayService.deleteSession()
 *                                                                client: lib/roleplay.ts (deleteRoleplaySession)
 */
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
