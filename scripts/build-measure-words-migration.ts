/**
 * Migration nạp `Word.measureWords` (lượng từ từ CVDICT, xem build-words.ts `measureWordsOf`) lên
 * production — CI chỉ chạy `prisma migrate deploy`. Thêm cột rồi UPDATE từng từ theo (simplified,
 * pinyinNumeric), CHỈ khi cột đang rỗng (không đè dữ liệu sửa tay về sau).
 *
 * Chạy: npx tsx scripts/build-measure-words-migration.ts <thư-mục-migration>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const dir = process.argv[2];
if (!dir) throw new Error('Thiếu thư mục migration');
const words = JSON.parse(
  readFileSync(join(root, 'data/processed/words.seed.json'), 'utf8'),
) as { simplified: string; pinyinNumeric: string; measureWords?: string[] }[];
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lines = [
  '-- Lượng từ cho trang từ điển (chú thích LT: của CVDICT đúng cách đọc), sinh bởi',
  '-- scripts/build-measure-words-migration.ts. Chỉ ghi khi cột đang rỗng.',
  'ALTER TABLE "Word" ADD COLUMN "measureWords" TEXT[] DEFAULT ARRAY[]::TEXT[];',
];
let n = 0;
for (const w of words) {
  if (!w.measureWords?.length) continue;
  n += 1;
  lines.push(
    `UPDATE "Word" SET "measureWords" = ARRAY[${w.measureWords.map(q).join(', ')}]::TEXT[] ` +
      `WHERE "simplified" = ${q(w.simplified)} AND "pinyinNumeric" = ${q(w.pinyinNumeric.toLowerCase())} ` +
      `AND "measureWords" = ARRAY[]::TEXT[];`,
  );
}
mkdirSync(join(root, dir), { recursive: true });
writeFileSync(join(root, dir, 'migration.sql'), lines.join('\n') + '\n');
console.log(`đã ghi ${n} từ có lượng từ vào ${dir}/migration.sql`);
