import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hostname } from 'node:os';
import type { Env } from '../../config/env.validation';
import { RedisService } from './redis.service';

export const HOUR_MS = 3_600_000;

/**
 * Cho phép chạy nhiều worker mà mỗi chu kỳ cron chỉ 1 bản làm: worker chết thì bản còn lại làm chu kỳ sau.
 *
 * Đây là khoá để TIẾT KIỆM, không phải khoá để ĐÚNG (DDIA ch. 8): worker có thể tạm dừng lâu rồi tỉnh lại khi hợp đồng đã
 * hết hạn, Redis cũng có thể mất khoá khi chuyển máy. Vì vậy mọi job vẫn phải tự an toàn khi chạy trùng: chốt giải đấu dựa
 * trên `endedAt`, cộng Premium bằng `UPDATE ... WHERE status = PENDING`, trùng thì chỉ thừa 1 lần thông báo.
 */
@Injectable()
export class CronLeaseService {
  private readonly logger = new Logger(CronLeaseService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('CRON_LEASE', { infer: true });
  }

  /** `true` nếu bản này được chạy chu kỳ hiện tại. Redis lỗi thì bỏ lượt: thà trễ 1 chu kỳ còn hơn chạy trùng. */
  async take(
    job: string,
    periodMs: number,
    now = Date.now(),
  ): Promise<boolean> {
    if (!this.enabled) return true;
    // Làm tròn thay vì cắt xuống: 2 máy lệch đồng hồ vài giây quanh mốc cron vẫn ra cùng 1 chu kỳ.
    const period = Math.round(now / periodMs);
    const won = await this.redis.client
      .set(`lease:${job}:${period}`, hostname(), 'PX', periodMs * 2, 'NX')
      .catch((err: Error) => {
        this.logger.warn(`Bỏ lượt ${job}: ${err.message}`);
        return null;
      });
    this.logger.log(`${job} chu kỳ ${period}: ${won ? 'chạy' : 'bỏ qua'}`);
    return won === 'OK';
  }
}
