/**
 * Nạp câu ví dụ cho từ vựng (WordExample) — dữ liệu Hanni tự soạn (không qua dịch máy),
 * HSK 1–3 (prisma/seed/data/word-examples-hsk{1,2,3}.json). Idempotent: xoá WordExample
 * cũ của đúng các từ trong danh sách rồi tạo lại, KHÔNG đụng tới Word hay các từ khác.
 * Pinyin sinh tự động bằng `examplePinyin()` (từ điển Hanni + luật đa âm); câu đọc sai thì
 * ghi tay ở phần tử thứ 5. Production nạp bằng migration (build-word-examples-migration.ts).
 *
 * Chạy: npx tsx scripts/seed-word-examples.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { examplePinyin } from '../src/modules/vocabulary/example-pinyin.util';
import { loadOverrides } from './build-word-examples-migration';

type ExampleEntry = [
  simplified: string,
  pinyinNumeric: string,
  zh: string,
  vi: string,
  /** pinyin soát tay khi cách sinh tự động đọc sai (vd 高兴地 "de") */
  pinyin?: string,
];

const overrides = loadOverrides();

async function seedFile(prisma: PrismaClient, file: string, source: string) {
  const entries = JSON.parse(readFileSync(file, 'utf8')) as ExampleEntry[];
  const found = await prisma.word.findMany({
    where: {
      OR: entries.map(([simplified, pinyinNumeric]) => ({
        simplified,
        pinyinNumeric,
      })),
    },
    select: { id: true, simplified: true, pinyinNumeric: true },
  });
  const idOf = new Map(
    found.map((w) => [`${w.simplified}|${w.pinyinNumeric}`, w.id]),
  );

  const rows = entries
    .map(([simplified, pinyinNumeric, zh, vi, manual]) => {
      const wordId = idOf.get(`${simplified}|${pinyinNumeric}`);
      if (!wordId) return null;
      return {
        wordId,
        zh,
        pinyin: manual ?? examplePinyin(zh, overrides),
        vi,
        orderIndex: 0,
        source,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const missing = entries.length - rows.length;
  if (missing > 0) {
    console.log(
      `  ⚠ ${missing}/${entries.length} từ không khớp Word nào trong DB (bỏ qua)`,
    );
  }

  await prisma.wordExample.deleteMany({
    where: { wordId: { in: rows.map((r) => r.wordId) } },
  });
  await prisma.wordExample.createMany({ data: rows });
  console.log(`  ✓ ${rows.length}/${entries.length} câu ví dụ từ ${file}`);
}

async function main() {
  const prisma = new PrismaClient();
  await seedFile(
    prisma,
    join(__dirname, '..', 'prisma', 'seed', 'data', 'word-examples-hsk1.json'),
    'Hanni soạn (2026-09)',
  );
  for (const level of [2, 3])
    await seedFile(
      prisma,
      join(
        __dirname,
        '..',
        'prisma',
        'seed',
        'data',
        `word-examples-hsk${level}.json`,
      ),
      'Hanni soạn (2026-10)',
    );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
