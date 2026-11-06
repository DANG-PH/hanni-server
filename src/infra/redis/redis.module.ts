import { Global, Module } from '@nestjs/common';
import { CronLeaseService } from './cron-lease.service';
import { DailyQuotaService } from './daily-quota.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, DailyQuotaService, CronLeaseService],
  exports: [RedisService, DailyQuotaService, CronLeaseService],
})
export class RedisModule {}
