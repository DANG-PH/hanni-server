import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gỡ ảnh minh hoạ từ vựng (2026-10-28): Word.imageUrl là ảnh tự lấy từ Wikipedia/Wikimedia Commons theo chữ Hán. Đo trên
 * 60 ảnh của từ HSK 1–3 thì khoảng một nửa sai nghĩa (妈妈 "mẹ" ra tranh "Placid death", 哥哥 ra logo Big Brother, 雪 ra
 * bản đồ đường đi bão) — gắn ảnh sai là dạy sai liên tưởng. Đã gỡ khỏi từ điển từ 2026-10-19 vì cùng lý do, nay gỡ nốt ở
 * bài học, flashcard, video, "Từ vựng hôm nay" cùng code tự lấy ảnh.
 *
 * KHÔNG hoàn tác được bằng migration (dữ liệu đã xoá) — muốn lấy lại thì khôi phục bản sao lưu chụp ngay trước khi
 * deploy (/root/backups/ trên VPS). Chạy lại an toàn (IF EXISTS).
 */
export class DropWordImageUrl1792710000000 implements MigrationInterface {
  name = 'DropWordImageUrl1792710000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Word" DROP COLUMN IF EXISTS "imageUrl"`,
    );
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'DropWordImageUrl đã xoá dữ liệu — không hoàn tác bằng migration. Khôi phục bản sao lưu trong /root/backups/.',
      ),
    );
  }
}
