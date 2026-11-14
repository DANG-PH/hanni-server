import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bảng `ContentReport` (2026-11-14, điều kiện lên CH Play): người dùng báo cáo nội dung AI, báo cáo người dùng khác,
 * gửi yêu cầu xoá tài khoản từ web. Chỉ thêm bảng mới, không đụng dữ liệu cũ; chạy lại an toàn (IF NOT EXISTS).
 */
export class ContentReport1792740000000 implements MigrationInterface {
  name = 'ContentReport1792740000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ContentReport" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "kind" text NOT NULL, "reason" text NOT NULL, "feature" text, "targetId" text, "content" text NOT NULL, "note" text NOT NULL, "contact" text, "userId" uuid, "status" text NOT NULL DEFAULT 'open', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(), CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id"), CONSTRAINT "ContentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ContentReport_createdAt_idx" ON "ContentReport" ("createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ContentReport"`);
  }
}
