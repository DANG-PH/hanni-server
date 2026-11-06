import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

// Gộp INCR + PEXPIRE + PTTL trong 1 lệnh nguyên tử: 2 tiến trình cùng đếm không làm mất lượt, khoá luôn có hạn.
const INCREMENT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { hits, redis.call('PTTL', KEYS[1]) }`;

// Mỗi request đều đi qua đây: Redis chậm hay mất thì chờ tối đa chừng này rồi cho qua, không để cả API chờ theo.
const REDIS_WAIT_MS = 150;

/** Bộ đếm giới hạn request dùng chung cho mọi tiến trình API. Bản mặc định của thư viện nằm trong bộ nhớ từng
 * tiến trình: chạy N bản sao thì hạn mức thật thành N lần.
 *
 * Redis lỗi thì CHO QUA: Redis chỉ giữ dữ liệu dựng lại được, mất nó không được biến thành sự cố toàn hệ thống. */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly redis: Pick<Redis, 'eval'>) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _block: number,
    name: string,
  ) {
    let totalHits: number;
    let pttl: number;
    let timer: NodeJS.Timeout | undefined;
    try {
      [totalHits, pttl] = (await Promise.race([
        this.redis.eval(INCREMENT, 1, `throttle:${name}:${key}`, ttl),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Redis quá chậm')),
            REDIS_WAIT_MS,
          );
        }),
      ])) as [number, number];
    } catch (err) {
      this.logger.warn(
        `Không đếm được giới hạn request: ${(err as Error).message}`,
      );
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } finally {
      clearTimeout(timer);
    }
    return {
      totalHits,
      timeToExpire: Math.ceil(pttl / 1000),
      isBlocked: totalHits > limit,
      timeToBlockExpire: totalHits > limit ? Math.ceil(pttl / 1000) : 0,
    };
  }
}
