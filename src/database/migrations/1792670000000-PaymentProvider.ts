import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm cổng MoMo bên cạnh payOS (2026-10-27): `PaymentOrder.provider` (PAYOS | MOMO — đơn cũ đều là PAYOS) +
 * `providerRef` (orderId đã gửi MoMo, để tra trạng thái giao dịch). Chạy lại không đổi gì (IF NOT EXISTS).
 */
export class PaymentProvider1792670000000 implements MigrationInterface {
  name = 'PaymentProvider1792670000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT 'PAYOS', ADD COLUMN IF NOT EXISTS "providerRef" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "PaymentOrder" DROP COLUMN "provider", DROP COLUMN "providerRef"`,
    );
  }
}
