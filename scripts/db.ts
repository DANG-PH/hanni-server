import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../src/database/database.config';

/** Kết nối DB cho script chạy tay — đọc `DATABASE_URL` từ `.env`. Nhớ `await db.destroy()` khi xong. */
export function connect(): Promise<DataSource> {
  return new DataSource(
    databaseOptions(process.env.DATABASE_URL ?? ''),
  ).initialize();
}
