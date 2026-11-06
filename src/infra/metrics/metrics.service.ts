import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { TraceFlags, context, trace } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';
import { DataSource } from 'typeorm';
import type { Env } from '../../config/env.validation';

interface PgPool {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Chỉ số cho Prometheus và nhật ký JSON từng request cho Loki. Bật bằng METRICS_ENABLED.
 * Đo theo HISTOGRAM để tính được p95, p99 (trung bình che mất nhóm người chờ lâu nhất).
 * Nhãn `route` là mẫu đường dẫn (`/api/learn/lessons/:id/session`), không phải URL thật: mỗi id là 1 chuỗi số liệu
 * riêng thì Prometheus sẽ nổ bộ nhớ.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();
  readonly enabled: boolean;
  private readonly outboxEnabled: boolean;
  private readonly duration = new Histogram({
    name: 'http_server_duration_seconds',
    help: 'Thời gian xử lý request',
    labelNames: ['method', 'route', 'status'] as const,
    // Có sẵn mốc 0,3 và 0,5 giây vì đó là 2 ngưỡng SLO đọc và ghi: phân vị tính ở đúng mốc thì không phải nội suy.
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  constructor(
    config: ConfigService<Env, true>,
    @InjectDataSource() private readonly db: DataSource,
  ) {
    this.enabled = config.get('METRICS_ENABLED', { infer: true });
    this.outboxEnabled =
      config.get('OUTBOX_ENABLED', { infer: true }) &&
      config.get('APP_ROLE', { infer: true }) !== 'api';
  }

  onModuleInit(): void {
    if (!this.enabled) return;
    collectDefaultMetrics({ register: this.registry });
    const pool = () => (this.db.driver as unknown as { master: PgPool }).master;
    new Gauge({
      name: 'db_pool_connections',
      help: 'Kết nối pool CSDL theo trạng thái; waiting > 0 kéo dài nghĩa là pool là nút thắt',
      labelNames: ['state'] as const,
      registers: [this.registry],
      collect() {
        const p = pool();
        this.set({ state: 'total' }, p?.totalCount ?? 0);
        this.set({ state: 'idle' }, p?.idleCount ?? 0);
        this.set({ state: 'waiting' }, p?.waitingCount ?? 0);
      },
    });
    if (this.outboxEnabled) {
      const db = this.db;
      new Gauge({
        name: 'outbox_pending',
        help: 'Việc phụ sau khi nộp bài chưa làm; tăng mãi nghĩa là worker không theo kịp',
        registers: [this.registry],
        async collect() {
          const [row] = await db.query<{ n: number }[]>(
            `SELECT count(*)::int AS n FROM "OutboxEvent" WHERE "processedAt" IS NULL`,
          );
          this.set(row.n);
        },
      });
    }
  }

  /** Middleware Express: đo mọi request; nhật ký kèm traceId để từ Loki nhảy sang đúng vết ở Jaeger. */
  observe = (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();
    // Chỉ ghi vết được lấy mẫu: vết không lấy mẫu không có trong Jaeger, bấm vào sẽ ra trang trống.
    const span = trace.getSpan(context.active())?.spanContext();
    const traceId =
      span && span.traceFlags & TraceFlags.SAMPLED ? span.traceId : undefined;
    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const routePath = (req.route as { path?: string } | undefined)?.path;
      const route = routePath ? `${req.baseUrl}${routePath}` : 'unmatched';
      if (route.endsWith('/metrics') || route.includes('/health')) return;
      this.duration.observe(
        { method: req.method, route, status: String(res.statusCode) },
        seconds,
      );
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          msg: 'http',
          method: req.method,
          route,
          status: res.statusCode,
          ms: Math.round(seconds * 1000),
          traceId,
        }),
      );
    });
    next();
  };
}
