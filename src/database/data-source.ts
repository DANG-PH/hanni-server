import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

/**
 * Cho lệnh TypeORM CLI (chạy migration khi deploy):
 *   npx typeorm migration:run -d dist/src/database/data-source.js
 */
export default new DataSource(databaseOptions(process.env.DATABASE_URL ?? ''));
