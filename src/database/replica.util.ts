import type { DataSource, QueryRunner } from 'typeorm';

/**
 * Chạy truy vấn trên bản sao đọc. Chỉ dùng cho dữ liệu chấp nhận cũ vài giây như bảng xếp hạng: lịch ôn, tiến độ của chính
 * người học vẫn đọc từ leader, nếu không vừa ôn xong có thể thấy lịch cũ (DDIA ch. 5, read-your-writes).
 * Chưa cấu hình DATABASE_REPLICA_URL thì TypeORM tự dùng CSDL chính.
 */
export async function onReplica<T>(
  db: DataSource,
  work: (runner: QueryRunner) => Promise<T>,
): Promise<T> {
  const runner = db.createQueryRunner('slave');
  try {
    return await work(runner);
  } finally {
    await runner.release();
  }
}
