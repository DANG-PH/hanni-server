import { Global, Module } from '@nestjs/common';
import { DailyQuotaService } from './daily-quota.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, DailyQuotaService],
  exports: [RedisService, DailyQuotaService],
})
export class RedisModule {}
