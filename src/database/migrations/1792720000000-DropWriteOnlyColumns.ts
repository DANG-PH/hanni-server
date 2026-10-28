import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Xoá 2 cột chỉ ghi, không chỗ nào đọc (2026-10-28, rà sau đợt DropUnusedTables — bộ dò lần trước tính cả chỗ GHI là
 * "đang dùng" nên bỏ sót): `DailyQuestClaim.xu` (luôn ghi 0 từ khi bỏ hệ thống xu 2026-10-20) và
 * `LeagueEntry.finalPoints` (điểm tuần ghi lúc chốt giải đấu nhưng không hiện ở đâu — tính lại được từ ReviewLog).
 *
 * KHÔNG hoàn tác được bằng migration (dữ liệu đã xoá) — muốn lấy lại thì khôi phục bản sao lưu chụp ngay trước khi
 * deploy (/root/backups/ trên VPS). Chạy lại an toàn (IF EXISTS).
 */
export class DropWriteOnlyColumns1792720000000 implements MigrationInterface {
  name = 'DropWriteOnlyColumns1792720000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "DailyQuestClaim" DROP COLUMN IF EXISTS "xu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "LeagueEntry" DROP COLUMN IF EXISTS "finalPoints"`,
    );
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'DropWriteOnlyColumns đã xoá dữ liệu — không hoàn tác bằng migration. Khôi phục bản sao lưu trong /root/backups/.',
      ),
    );
  }
}
