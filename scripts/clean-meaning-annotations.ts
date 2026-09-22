/**
 * Di trú MỘT LẦN: gỡ chú thích LƯỢNG TỪ của CEDICT còn sót trong
 * `Word.meaningVi` — vd "thế giới (LT:個|个[ge4])", "khủng long; LT:頭|头[tou2]".
 *
 * Người học Việt đọc đoạn đó không hiểu gì, mà nó lại rơi đúng vào những từ
 * rất thông dụng (世界, 猫, 路, 菜) — 世界 còn nằm trong bộ thẻ "học thử" là
 * trang đích của phễu SEO. Đo 2026-09-22: 22/10.894 từ dính.
 *
 * `cleanDef()` trong `scripts/import/build-words.ts` đã được sửa để bản
 * seed dựng lại sau này sạch sẵn; script này lo phần DB ĐANG CHẠY.
 *
 * Chỉ đụng cột `meaningVi`. Idempotent, chạy lại vô hại.
 * Chạy: npx tsx scripts/clean-meaning-annotations.ts
 */
import { PrismaClient } from '@prisma/client';

function clean(v: string): string {
  return v
    .replace(/\s*\(LT:[^)]*\)/g, '')
    .replace(/\s*;?\s*LT:\s*\S+/g, '')
    .replace(/\s*;\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.word.findMany({
    where: { meaningVi: { contains: 'LT:' } },
    select: { id: true, simplified: true, meaningVi: true },
  });
  console.log(`${rows.length} từ còn dính chú thích lượng từ`);

  let done = 0;
  for (const w of rows) {
    const next = clean(w.meaningVi!);
    if (!next || next === w.meaningVi) continue;
    await prisma.word.update({
      where: { id: w.id },
      data: { meaningVi: next },
    });
    console.log(`  ${w.simplified}: "${w.meaningVi}" -> "${next}"`);
    done += 1;
  }
  console.log(`Xong: ${done} từ`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
