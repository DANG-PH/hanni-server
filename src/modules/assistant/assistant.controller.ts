import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AssistantService } from './assistant.service';
import { AskAssistantDto } from './dto/ask-assistant.dto';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /assistant/sessions                      [đăng nhập]  Bong bóng trợ lý AI (góc dưới phải) → nút đồng hồ:
 *                                                                 danh sách cuộc trò chuyện
 *                                                                 → sessions() → AssistantService.listSessions()
 *                                                                 client: lib/hooks.ts (useAssistantSessions)
 * POST      /assistant/sessions                      [đăng nhập]  Bong bóng trợ lý AI → nút "+" tạo cuộc trò chuyện
 *                                                                 mới
 *                                                                 → newSession() → AssistantService.createSession()
 *                                                                 client: lib/hooks.ts (createAssistantSession)
 * GET       /assistant/sessions/:sessionId/messages  [đăng nhập]  Bong bóng trợ lý AI → mở lại 1 cuộc trò chuyện cũ
 *                                                                 → messages() → AssistantService.getMessages()
 *                                                                 client: lib/hooks.ts (useAssistantMessages)
 * DELETE    /assistant/sessions/:sessionId           [đăng nhập]  Bong bóng trợ lý AI → xoá 1 cuộc trò chuyện
 *                                                                 → deleteSession() →
 *                                                                   AssistantService.deleteSession()
 *                                                                 client: lib/hooks.ts (deleteAssistantSession)
 * POST      /assistant/ask                           [đăng nhập]  Hỏi trợ lý không streaming — client hiện KHÔNG dùng
 *                                                                 (dùng bản stream bên dưới)
 *                                                                 → ask() → AssistantService.ask()
 * GET·SSE   /assistant/ask/stream                    [đăng nhập]  Bong bóng trợ lý AI → gửi câu hỏi; câu trả lời hiện
 *                                                                 dần từng chữ (SSE)
 *                                                                 → askStream() → AssistantService.askStream()
 *                                                                 client: lib/hooks.ts (streamAssistant)
 * GET       /assistant/status                        [đăng nhập]  Chẩn đoán trợ lý (đã bật Gemini chưa, đã đánh index
 *                                                                 bao nhiêu đoạn) — gọi tay bằng curl, không có giao
 *                                                                 diện
 *                                                                 → status() → AssistantService.getStatus()
 */
@ApiTags('assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.assistant.listSessions(user.id);
  }

  @Post('sessions')
  newSession(@CurrentUser() user: AuthUser) {
    return this.assistant.createSession(user.id);
  }

  @Get('sessions/:sessionId/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.assistant.getMessages(user.id, sessionId);
  }

  @Delete('sessions/:sessionId')
  deleteSession(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.assistant.deleteSession(user.id, sessionId);
  }

  // Đã bỏ @Throttle theo yêu cầu (chặn cả lúc test lẫn dùng thật) — giới hạn
  // spam ngắn hạn giờ không còn, nhưng `AssistantService.checkDailyAskQuota()`
  // đã chặn LẠM DỤNG DÀI HẠN qua hạn mức lượt hỏi/ngày cho user miễn phí
  // (Premium không giới hạn), xem TODO(scale) ở assistant.service.ts.
  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskAssistantDto) {
    return this.assistant.ask(user.id, dto.message, dto.sessionId);
  }

  // SSE (EventSource) chỉ hỗ trợ GET nên nhận message/sessionId qua query
  // thay vì body — message tối đa 1000 ký tự nên URL không quá dài.
  @Sse('ask/stream')
  askStream(
    @CurrentUser() user: AuthUser,
    @Query() dto: AskAssistantDto,
  ): Observable<MessageEvent> {
    return this.assistant.askStream(user.id, dto.message, dto.sessionId);
  }

  @Get('status')
  status() {
    return this.assistant.getStatus();
  }
}
