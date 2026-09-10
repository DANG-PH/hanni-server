import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Smoke test — cần Postgres + Redis đang chạy (docker compose up -d).
 */
describe('Hanni API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET) trả về trạng thái', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        if (!('status' in res.body)) throw new Error('thiếu field status');
      });
  });

  it('/api/users/me (GET) yêu cầu đăng nhập', () => {
    return request(app.getHttpServer()).get('/api/users/me').expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
