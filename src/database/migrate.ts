import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

/**
 * Chạy các migration chưa chạy (thư mục `migrations/`), mỗi migration 1 transaction.
 * - Máy dev: `npm run db:migrate`
 * - Deploy: `node dist/src/database/migrate.js` (CI gọi trước khi khởi động lại server)
 */
async function main(): Promise<void> {
  const db = await new DataSource(
    databaseOptions(process.env.DATABASE_URL ?? ''),
  ).initialize();
  const ran = await db.runMigrations({ transaction: 'each' });
  console.log(
    ran.length
      ? `Đã chạy ${ran.length} migration: ${ran.map((m) => m.name).join(', ')}`
      : 'Không có migration mới.',
  );
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
