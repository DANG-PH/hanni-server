/**
 * Di trú MỘT LẦN: gán Word.hanViet (âm Hán Việt, xem scripts/import/lib/hanviet.ts) cho
 * DB ĐÃ seed sẵn, dựa trên data/processed/words.seed.json đã build lại kèm field này.
 *
 * KHÔNG đụng gì khác ngoài cột hanViet — UserWordProgress/SRS không bị ảnh hưởng.
 * Cập nhật theo LÔ bằng 1 câu SQL UPDATE...FROM (values) mỗi lô, thay vì 1 updateMany/từ
 * (cách cũ ở migrate-lesson-themes.ts từng mất ~50 phút cho HSK7 qua tunnel SSH) — nhanh
 * hơn nhiều lần vì giảm số round-trip mạng.
 *
 * Chạy: npx tsx scripts/backfill-hanviet.ts
 */
import { PrismaClient } from '@prisma/client';
import { loadWordSeed } from '../prisma/seed/words';

const CHUNK = 500;

async function main() {
  const prisma = new PrismaClient();
  const all = loadWordSeed();
  if (!all) throw new Error('Không đọc được data/processed/words.seed.json');

  const withHanViet = all.filter((w) => w.hanViet);
  console.log(`${withHanViet.length}/${all.length} từ có âm Hán Việt để nạp`);

  let updated = 0;
  for (let i = 0; i < withHanViet.length; i += CHUNK) {
    const chunk = withHanViet.slice(i, i + CHUNK);
    const values = chunk
      .map(
        (_, j) =>
          `($${j * 3 + 1}::text, $${j * 3 + 2}::text, $${j * 3 + 3}::text)`,
      )
      .join(', ');
    const params = chunk.flatMap((w) => [
      w.simplified,
      w.pinyinNumeric.toLowerCase(),
      w.hanViet,
    ]);
    const res: number = await prisma.$executeRawUnsafe(
      `UPDATE "Word" AS w SET "hanViet" = v.han_viet
       FROM (VALUES ${values}) AS v(simplified, pinyin_numeric, han_viet)
       WHERE w.simplified = v.simplified AND w."pinyinNumeric" = v.pinyin_numeric`,
      ...params,
    );
    updated += res;
    console.log(
      `  ... ${Math.min(i + CHUNK, withHanViet.length)}/${withHanViet.length}`,
    );
  }
  console.log(`✓ đã cập nhật hanViet cho ${updated} dòng Word`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
