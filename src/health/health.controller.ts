import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { RedisService } from '../infra/redis/redis.service';

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
