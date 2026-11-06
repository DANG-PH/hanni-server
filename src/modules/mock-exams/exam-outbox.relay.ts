import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Env } from '../../config/env.validation';
import {
  CronLeaseService,
  HOUR_MS,
} from '../../infra/redis/cron-lease.service';
import { StreakService } from '../gamification/streak/streak.service';

const BATCH = 100;

interface ExamSubmitted {
  userId: string;
  minutes: number;
  at: string;
}

/**
 * Worker đọc outbox rồi làm việc phụ sau khi nộp bài. `FOR UPDATE SKIP LOCKED` cho nhiều worker lấy việc song song mà không
 * giẫm nhau, nên phần này không cần hợp đồng thuê.
 *
 * Giao nhận ít nhất 1 lần: chết sau khi cập nhật chuỗi ngày nhưng trước khi đánh dấu xong thì lần sau làm lại. Hậu quả
 * chấp nhận được: phút học cộng thêm 1 lần, chuỗi ngày không đổi vì tính theo ngày.
 */
@Injectable()
export class ExamOutboxRelay {
  private readonly enabled: boolean;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly streak: StreakService,
    private readonly lease: CronLeaseService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('OUTBOX_ENABLED', { infer: true });
  }

  @Interval(1000)
  async drain(): Promise<void> {
    if (!this.enabled) return;
    while ((await this.drainBatch()) === BATCH);
  }

  private drainBatch(): Promise<number> {
    return this.db.transaction(async (tx) => {
      const rows = await tx.query<{ id: string; payload: ExamSubmitted }[]>(
        `SELECT "id", "payload" FROM "OutboxEvent" WHERE "processedAt" IS NULL
         ORDER BY "createdAt" LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [BATCH],
      );
      for (const { payload } of rows) {
        await this.streak.recordActivity(payload.userId, new Date(payload.at), {
          minutesStudied: payload.minutes,
        });
      }
      if (rows.length) {
        await tx.query(
          `UPDATE "OutboxEvent" SET "processedAt" = now() WHERE "id" = ANY($1)`,
          [rows.map((r) => r.id)],
        );
      }
      return rows.length;
    });
  }

  /** Outbox chỉ là hàng đợi, không phải lịch sử: dữ liệu gốc nằm ở MockExamAttempt. */
  @Cron(CronExpression.EVERY_HOUR)
  async purge(): Promise<void> {
    if (!this.enabled || !(await this.lease.take('outbox-purge', HOUR_MS))) {
      return;
    }
    await this.db.query(
      `DELETE FROM "OutboxEvent" WHERE "processedAt" < now() - interval '7 days'`,
    );
  }
}
