import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';
import { MetricsService } from './infra/metrics/metrics.service';
import { RedisIoAdapter } from './infra/redis/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // API chạy sau Nginx cùng máy: không tin proxy thì `req.ip` của MỌI request là 127.0.0.1 — giới hạn
  // THROTTLE_LIMIT/phút thành hạn mức CHUNG cho cả hệ thống (đo 2026-10-19: VPS gọi 1 lần, bộ đếm của
  // máy khác tụt 11). Mặc định chỉ tin loopback (Nginx) nên IP lấy đúng IP Nginx ghi, không giả được.
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  // WebSocket (NotificationsGateway, tin nhắn realtime) chạy chung cổng HTTP
  // — gắn Redis adapter để pub/sub được xuyên suốt khi chạy nhiều instance.
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(config.get('REDIS_URL', { infer: true }));
  app.useWebSocketAdapter(redisIoAdapter);

  // Đo trước mọi middleware khác để số đo gồm cả thời gian của guard và pipe.
  if (config.get('METRICS_ENABLED', { infer: true })) {
    app.use(app.get(MetricsService).observe);
  }
  if (
    config.get('SHED_POOL_WAITING', { infer: true }) > 0 ||
    config.get('SHED_LOOP_LAG_MS', { infer: true }) > 0
  ) {
    app.use(app.get(MetricsService).shed);
  }

  const apiPrefix = config.get('API_PREFIX', { infer: true });
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''));

  app.use(
    helmet({
      // Cho phép frontend (origin khác) tải ảnh đại diện / audio phát âm ở /media/*.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Hanni API')
        .setDescription('API học tiếng Trung theo chuẩn HSK 3.0')
        .setVersion('0.1.0')
        .addBearerAuth()
        .addCookieAuth('hanni_access')
        .build(),
    );
    SwaggerModule.setup(`${apiPrefix.replace(/^\//, '')}/docs`, app, doc);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  console.log(`Hanni API chạy tại http://localhost:${port}${apiPrefix}`);
}

void bootstrap();
