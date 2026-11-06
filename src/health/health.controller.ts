import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { RedisService } from '../infra/redis/redis.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /health  [khách]      Không phải giao diện: GitHub Actions (uptime.yml) + bước deploy gọi để biết DB +
 *                                 Redis còn sống
 *                                 → check()
 * GET       /health/live  [khách] Không phải giao diện: Kubernetes liveness probe. Chỉ báo tiến trình còn sống,
 *                                 KHÔNG hỏi DB/Redis — DB chết mà khởi động lại API cũng không giúp gì, còn làm tệ hơn
 *                                 → live()
 * GET       /health/ready  [khách] Không phải giao diện: Kubernetes readiness probe. 503 khi không tới được CSDL để
 *                                 ngừng nhận request; Redis lỗi vẫn sẵn sàng vì Redis chỉ giữ dữ liệu dựng lại được
 *                                 → ready()
 */
// Probe không đi qua giới hạn request: giới hạn phụ thuộc Redis, mà Redis lỗi không được kéo theo pod "chưa sẵn sàng".
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready() {
    await this.db.query('SELECT 1').catch(() => {
      throw new ServiceUnavailableException('Chưa sẵn sàng');
    });
    return { status: 'ok' };
  }

  @Public()
  @Get()
  async check() {
    const [db, cache] = await Promise.all([
      this.db
        .query('SELECT 1')
        .then(() => 'up')
        .catch(() => 'down'),
      this.redis.client
        .ping()
        .then(() => 'up')
        .catch(() => 'down'),
    ]);
    const ok = db === 'up' && cache === 'up';
    return {
      status: ok ? 'ok' : 'degraded',
      db,
      redis: cache,
      ts: new Date().toISOString(),
    };
  }
}
