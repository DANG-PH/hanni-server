import { forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../../common/types';
import type { Env } from '../../config/env.validation';
import { ACCESS_COOKIE } from '../auth/cookies';
import { DuelService } from '../duel/duel.service';
import { TeamDuelService } from '../duel/team-duel.service';

function roomFor(userId: string): string {
  return `user:${userId}`;
}

interface SocketData {
  userId?: string;
}

/** Parse thô header `Cookie: a=1; b=2` — đủ dùng, không cần thêm gói ngoài. */
function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Đẩy thông báo realtime tới đúng user đang mở app (mỗi user 1 "phòng").
 * Xác thực bằng cookie `hanni_access` gửi kèm handshake — trình duyệt chỉ gửi
 * cookie SameSite=Lax này khi request cùng gốc, nên origin lạ không giả mạo được.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() private server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    @Inject(forwardRef(() => DuelService)) private readonly duel: DuelService,
    @Inject(forwardRef(() => TeamDuelService))
    private readonly teamDuel: TeamDuelService,
  ) {}

  handleConnection(client: Socket): void {
    const userId = this.authenticate(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    (client.data as SocketData).userId = userId;
    void client.join(roomFor(userId));
    // Huỷ timer forfeit nếu vừa rớt mạng giữa 1 trận đấu rồi kết nối lại kịp.
    this.duel.handlePlayerReconnect(userId);
    this.teamDuel.handlePlayerReconnect(userId);
  }

  /** Rời hàng đợi ngay nếu đang chờ ghép trận; trận ĐANG diễn ra thì cho
   * `DISCONNECT_FORFEIT_MS` để load lại/mạng chập chờn ngắn trước khi xử
   * thua (xem `DuelService.handlePlayerDisconnect()`). */
  handleDisconnect(client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    this.duel.handlePlayerDisconnect(userId);
    this.teamDuel.handlePlayerDisconnect(userId);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(roomFor(userId)).emit(event, payload);
  }

  /** Báo "đang nhập" cho 1 hội thoại — không lưu DB, chỉ chuyển tiếp trực
   * tiếp tới người nhận (`toUserId` do client tự biết từ danh sách hội
   * thoại đã tải, khỏi cần tra lại DB ở đây). */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; toUserId?: string },
  ): void {
    const userId = (client.data as SocketData).userId;
    if (!userId || !data?.conversationId || !data?.toUserId) return;
    this.emitToUser(data.toUserId, 'typing', {
      conversationId: data.conversationId,
      userId,
    });
  }

  /** "Đấu 1v1" — 3 sự kiện chuyển thẳng cho DuelService xử lý (ghép trận,
   * chấm điểm từng vòng, tính ELO); gateway chỉ lo xác thực + đọc payload. */
  @SubscribeMessage('duel:join-queue')
  handleDuelJoinQueue(@ConnectedSocket() client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    void this.duel.joinQueue(userId);
  }

  @SubscribeMessage('duel:leave-queue')
  handleDuelLeaveQueue(@ConnectedSocket() client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    this.duel.leaveQueue(userId);
  }

  @SubscribeMessage('duel:answer')
  handleDuelAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId?: string; chosenIndex?: number },
  ): void {
    const userId = (client.data as SocketData).userId;
    if (!userId || !data?.matchId || data.chosenIndex == null) return;
    void this.duel.submitAnswer(userId, data.matchId, data.chosenIndex);
  }

  /** "Đấu đôi" 2v2 — 3 sự kiện y hệt kiểu đấu 1v1, chuyển thẳng cho
   * TeamDuelService xử lý. */
  @SubscribeMessage('teamduel:join-queue')
  handleTeamDuelJoinQueue(@ConnectedSocket() client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    void this.teamDuel.joinQueue(userId);
  }

  @SubscribeMessage('teamduel:leave-queue')
  handleTeamDuelLeaveQueue(@ConnectedSocket() client: Socket): void {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    this.teamDuel.leaveQueue(userId);
  }

  @SubscribeMessage('teamduel:answer')
  handleTeamDuelAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId?: string; chosenIndex?: number },
  ): void {
    const userId = (client.data as SocketData).userId;
    if (!userId || !data?.matchId || data.chosenIndex == null) return;
    this.teamDuel.submitAnswer(userId, data.matchId, data.chosenIndex);
  }

  private authenticate(client: Socket): string | null {
    const raw = client.handshake.headers.cookie;
    if (!raw) return null;
    const token = parseCookieHeader(raw)[ACCESS_COOKIE];
    if (!token) return null;
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      return payload.sub;
    } catch (err) {
      this.logger.debug(`Kết nối WS bị từ chối: ${(err as Error).message}`);
      return null;
    }
  }
}
