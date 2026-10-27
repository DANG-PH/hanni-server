import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly redis: RedisService,
  ) {}

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
