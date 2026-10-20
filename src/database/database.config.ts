import { join } from 'node:path';
import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

/**
 * Cấu hình kết nối Postgres dùng chung cho app (`DatabaseModule`) và lệnh migration (`data-source.ts`).
 *
 * Thời gian: các cột `timestamp(3)` lưu giờ UTC KHÔNG kèm múi giờ (kiểu Prisma tạo ra). Driver pg mặc định
 * đọc/ghi chúng theo GIỜ MÁY — VPS chạy giờ Việt Nam nên sẽ lệch 7 tiếng. Vì vậy:
 * - đọc: coi chuỗi DB là UTC (thêm 'Z');
 * - ghi: `parseInputDatesAsUTC` — gửi Date dạng UTC;
 * - phiên làm việc đặt TimeZone=UTC để `CURRENT_TIMESTAMP` (cột mặc định) cũng ra giờ UTC.
 * Cột `date` đọc nguyên chuỗi 'YYYY-MM-DD' — transformer `dateOnly` đổi sang Date.
 */
pg.types.setTypeParser(
  pg.types.builtins.TIMESTAMP,
  (s) => new Date(`${s.replace(' ', 'T')}Z`),
);
pg.types.setTypeParser(pg.types.builtins.DATE, (s) => s);
pg.defaults.parseInputDatesAsUTC = true;

/** DATABASE_URL cũ có tham số riêng của Prisma (`schema`, `connection_limit`…) — pg không hiểu, bỏ đi. */
function cleanUrl(url: string) {
  const u = new URL(url);
  for (const key of [
    'schema',
    'connection_limit',
    'pool_timeout',
    'pgbouncer',
    'connect_timeout',
  ])
    u.searchParams.delete(key);
  return u.toString();
}

export function databaseOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: cleanUrl(url),
    entities: ENTITIES,
    // Chạy từ mã nguồn (tsx) thì nạp .ts, từ bản build thì .js (bản build còn sinh kèm .d.ts — bỏ qua).
    migrations: [
      join(
        __dirname,
        'migrations',
        __filename.endsWith('.ts') ? '*.ts' : '*.js',
      ),
    ],
    migrationsTableName: 'typeorm_migrations',
    // Cột id mặc định `gen_random_uuid()` — có sẵn từ Postgres 13, không cần TypeORM tự CREATE EXTENSION lúc kết nối.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    synchronize: false,
    logging: ['error'],
    // `where: { x: null }` = "x IS NULL" như Prisma. Mặc định TypeORM BỎ QUA null → khớp mọi dòng.
    invalidWhereValuesBehavior: { null: 'sql-null', undefined: 'ignore' },
    extra: { options: '-c TimeZone=UTC' },
  };
}
