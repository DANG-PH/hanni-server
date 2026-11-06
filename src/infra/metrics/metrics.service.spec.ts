import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { Env } from '../../config/env.validation';
import { MetricsService } from './metrics.service';

function make(env: { pool?: number; lag?: number }, waitingCount = 0) {
  const values: Record<string, unknown> = {
    METRICS_ENABLED: false,
    SHED_POOL_WAITING: env.pool ?? 0,
    SHED_LOOP_LAG_MS: env.lag ?? 0,
    OUTBOX_ENABLED: false,
    APP_ROLE: 'api',
  };
  const config = { get: (key: string) => values[key] };
  const db = { driver: { master: { waitingCount } } };
  return new MetricsService(
    config as unknown as ConfigService<Env, true>,
    db as unknown as DataSource,
  );
}

function call(service: MetricsService, method: string, originalUrl: string) {
  const res = { status: jest.fn(), set: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.set.mockReturnValue(res);
  const next = jest.fn();
  service.shed(
    { method, originalUrl } as Request,
    res as unknown as Response,
    next as NextFunction,
  );
  return { res, next };
}

describe('MetricsService.shed', () => {
  it('cho qua khi chưa quá tải', () => {
    const { next, res } = call(
      make({ pool: 8, lag: 250 }),
      'GET',
      '/api/words',
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('từ chối lượt đọc khi hàng đợi CSDL dài', () => {
    const { res, next } = call(make({ pool: 8 }, 8), 'GET', '/api/words');
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '2');
    expect(next).not.toHaveBeenCalled();
  });

  it('từ chối lượt đọc khi event loop trễ dù hàng đợi CSDL trống', () => {
    const service = make({ pool: 8, lag: 250 });
    Object.assign(service, { loopLagMs: 300 });
    const { res } = call(service, 'GET', '/api/words');
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('không bao giờ từ chối lượt ghi', () => {
    const service = make({ pool: 8, lag: 250 }, 50);
    Object.assign(service, { loopLagMs: 900 });
    const { next } = call(service, 'POST', '/api/mock-exams/hsk1/submit');
    expect(next).toHaveBeenCalled();
  });

  it('không từ chối health và metrics, nếu không pod bị coi là chết', () => {
    const service = make({ lag: 250 });
    Object.assign(service, { loopLagMs: 900 });
    expect(call(service, 'GET', '/api/health/ready').next).toHaveBeenCalled();
    expect(call(service, 'GET', '/api/metrics').next).toHaveBeenCalled();
  });

  it('ngưỡng 0 là tắt', () => {
    const service = make({ pool: 0, lag: 0 }, 99);
    Object.assign(service, { loopLagMs: 9999 });
    expect(call(service, 'GET', '/api/words').next).toHaveBeenCalled();
  });
});
