import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../config/env.validation';

/**
 * Bọc ioredis. Dùng cho: lưu state OAuth (TTL ngắn), cache đọc từ vựng,
 * và về sau là hàng đợi BullMQ / rate-limit store.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.client.on('error', (err) =>
      this.logger.error(`Lỗi Redis: ${err.message}`),
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Đã kết nối Redis');
    } catch (err) {
      this.logger.warn(
        `Không kết nối được Redis lúc khởi động (sẽ thử lại khi có request): ${
          (err as Error).message
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  /** Lưu 1 giá trị JSON có TTL (giây). */
  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  /** Đọc giá trị JSON, tự parse. Trả null nếu không có. */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  /** Đọc rồi xoá luôn (dùng cho state OAuth — one-time). */
  async takeJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.getdel(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
}
