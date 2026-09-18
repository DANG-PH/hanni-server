/**
 * Nạp câu ví dụ cho từ vựng (WordExample) — dữ liệu Hanni tự soạn (không qua dịch máy),
 * hiện chỉ có HSK1 (prisma/seed/data/word-examples-hsk1.json). Idempotent: xoá WordExample
 * cũ của đúng các từ trong danh sách rồi tạo lại, KHÔNG đụng tới Word hay các từ khác.
 * Pinyin sinh tự động bằng pinyin-pro, không cần soạn tay để tránh sai dấu thanh.
 *
 * Chạy: npx tsx scripts/seed-word-examples.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { pinyin } from 'pinyin-pro';

type ExampleEntry = [
  simplified: string,
  pinyinNumeric: string,
  zh: string,
  vi: string,
];

function toReadablePinyin(zh: string): string {
  return pinyin(zh, { toneType: 'symbol', nonZh: 'consecutive' })
    .replace(/\s*。\s*/g, '.')
    .replace(/\s*，\s*/g, ', ')
    .replace(/\s*？\s*/g, '?')
    .replace(/\s*！\s*/g, '!')
    .trim();
}

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
    .map(([simplified, pinyinNumeric, zh, vi]) => {
      const wordId = idOf.get(`${simplified}|${pinyinNumeric}`);
      if (!wordId) return null;
      return {
        wordId,
        zh,
        pinyin: toReadablePinyin(zh),
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
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
