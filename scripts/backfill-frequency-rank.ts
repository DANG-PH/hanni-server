/**
 * Nạp lại `Word.frequencyRank` từ data/processed/words.seed.json cho DB đã
 * seed sẵn — sau khi ETL đổi sang xếp theo cấp HSK trước, tần suất trong cấp
 * sau (xem build-words.ts: số đếm của krmanik tách file theo cấp nên không so
 * được giữa các cấp, 著名 HSK4 từng đứng hạng 1 trên cả 的).
 *
 * Chỉ đụng cột frequencyRank. UPDATE theo lô 500 dòng/câu như backfill-hanviet.
 * Chạy: npx tsx scripts/backfill-frequency-rank.ts
 */
import { PrismaClient } from '@prisma/client';
import { loadWordSeed } from '../prisma/seed/words';

const CHUNK = 500;

async function main() {
  const prisma = new PrismaClient();
  const all = loadWordSeed();
  if (!all) throw new Error('Không đọc được data/processed/words.seed.json');

  const ranked = all.filter((w) => w.frequencyRank != null);
  console.log(`${ranked.length}/${all.length} từ có thứ hạng để nạp`);

  let updated = 0;
  for (let i = 0; i < ranked.length; i += CHUNK) {
    const chunk = ranked.slice(i, i + CHUNK);
    const values = chunk
      .map(
        (_, j) =>
          `($${j * 3 + 1}::text, $${j * 3 + 2}::text, $${j * 3 + 3}::int)`,
      )
      .join(', ');
    const params = chunk.flatMap((w) => [
      w.simplified,
      w.pinyinNumeric.toLowerCase(),
      w.frequencyRank,
    ]);
    updated += await prisma.$executeRawUnsafe(
      `UPDATE "Word" AS w SET "frequencyRank" = v.rank
       FROM (VALUES ${values}) AS v(simplified, pinyin_numeric, rank)
       WHERE w.simplified = v.simplified AND w."pinyinNumeric" = v.pinyin_numeric`,
      ...params,
    );
  }
  console.log(`✓ đã cập nhật frequencyRank cho ${updated} dòng Word`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
