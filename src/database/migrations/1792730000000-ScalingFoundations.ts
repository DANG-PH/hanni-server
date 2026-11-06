import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nền cho nhiều bản API: khoá chống trùng khi nộp bài thi, và bảng outbox. Chỉ THÊM, code cũ chạy song song được
 * (DDIA ch. 4: đổi lược đồ theo kiểu mở rộng trước). Chạy lại an toàn.
 */
export class ScalingFoundations1792730000000 implements MigrationInterface {
  name = 'ScalingFoundations1792730000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "MockExamAttempt" ADD COLUMN IF NOT EXISTS "idempotencyKey" text`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "MockExamAttempt_userId_idempotencyKey_key"
       ON "MockExamAttempt" ("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "OutboxEvent" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" text NOT NULL,
        "payload" jsonb NOT NULL,
        "createdAt" timestamp(3) NOT NULL DEFAULT now(),
        "processedAt" timestamp(3),
        CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "OutboxEvent_pending_idx"
       ON "OutboxEvent" ("createdAt") WHERE "processedAt" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "OutboxEvent"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "MockExamAttempt_userId_idempotencyKey_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "MockExamAttempt" DROP COLUMN IF EXISTS "idempotencyKey"`,
    );
  }
}
