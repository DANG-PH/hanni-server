import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../../common/types';
import type { Env } from '../../config/env.validation';
import { ACCESS_COOKIE } from '../auth/cookies';

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
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() private server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  handleConnection(client: Socket): void {
    const userId = this.authenticate(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    (client.data as SocketData).userId = userId;
    void client.join(roomFor(userId));
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
