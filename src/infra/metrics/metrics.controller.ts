import { Controller, Get, Header, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

/**
 * BẢN ĐỒ — không phải giao diện: Prometheus đọc route này mỗi 15 giây.
 *
 * GET       /metrics  [khách]    Chỉ có khi METRICS_ENABLED=true; ingress không chuyển đường dẫn này ra ngoài
 *                                → metrics()
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics() {
    if (!this.service.enabled) throw new NotFoundException();
    return this.service.registry.metrics();
  }
}
