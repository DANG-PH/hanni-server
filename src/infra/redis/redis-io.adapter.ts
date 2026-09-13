import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, type ServerOptions } from 'socket.io';

/**
 * Bridge WebSocket (NotificationsGateway) qua Redis pub/sub — bắt buộc khi
 * chạy nhiều instance NestJS (scale ngang) vì mỗi instance chỉ giữ kết nối
 * WebSocket của riêng nó; không có adapter này thì `emitToUser()` chỉ tới
 * được user đang connect ĐÚNG instance đang xử lý request đó, bỏ sót user
 * đang connect ở instance khác. Dùng ioredis (đã có sẵn trong project) thay
 * vì thêm package `redis` mới. Nếu Redis lỗi lúc khởi động, rơi về adapter
 * mặc định (in-memory, đúng hành vi 1 instance như trước đây) thay vì crash
 * toàn bộ app — nhất quán với cách RedisService tự chịu lỗi khi khởi động.
 */
export class RedisIoAdapter extends IoAdapter {
  private static readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(redisUrl: string): Promise<void> {
    try {
      const pubClient = new Redis(redisUrl, { lazyConnect: true });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      RedisIoAdapter.logger.log(
        'Đã gắn Redis adapter cho WebSocket (sẵn sàng scale nhiều instance)',
      );
    } catch (err) {
      RedisIoAdapter.logger.warn(
        `Không gắn được Redis adapter cho WebSocket, dùng adapter mặc định (chỉ đúng khi chạy 1 instance): ${
          (err as Error).message
        }`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
