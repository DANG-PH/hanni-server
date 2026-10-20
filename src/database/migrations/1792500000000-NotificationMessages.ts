import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thông báo có ích cho việc học (2026-10-20): giáo viên giao bài, kết quả giải đấu tuần, lá chắn giữ chuỗi. Câu chữ
 * và đường dẫn soạn sẵn ở server (`message`, `href`) — client chỉ việc hiện ra và mở đúng trang khi bấm.
 * Hai loại cũ COMMENT_REPLY, NEW_FOLLOWER giữ trong enum (dữ liệu cũ còn dòng) nhưng không còn tạo/hiện.
 */
export class NotificationMessages1792500000000 implements MigrationInterface {
  name = 'NotificationMessages1792500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of ['CLASS_ASSIGNMENT', 'LEAGUE_RESULT', 'STREAK_SAVED'])
      await queryRunner.query(
        `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    await queryRunner.query(
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" text, ADD COLUMN IF NOT EXISTS "href" text`,
    );
  }

  /** Postgres không gỡ được giá trị đã thêm vào enum — chỉ bỏ 2 cột. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Notification" DROP COLUMN "message", DROP COLUMN "href"`,
    );
  }
}
