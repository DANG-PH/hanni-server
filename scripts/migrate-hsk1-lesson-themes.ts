/**
 * Di trú MỘT LẦN: gán lại Word.lessonId/lessonOrder cho 300 từ HSK1 theo bài học
 * chủ đề mới (xem data/curated/lesson-themes-hsk1.json), áp dụng cho DB ĐÃ seed sẵn.
 *
 * KHÔNG xoá/tạo lại Word — chỉ cập nhật lessonId/lessonOrder trên các dòng đã có,
 * nên toàn bộ UserWordProgress/SRS của người dùng thật không bị ảnh hưởng.
 *
 * Chạy: npx tsx scripts/migrate-hsk1-lesson-themes.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedLessons } from '../prisma/seed/lessons';
import { loadWordSeed } from '../prisma/seed/words';

async function main() {
  const prisma = new PrismaClient();
  const all = loadWordSeed();
  if (!all) throw new Error('Không đọc được data/processed/words.seed.json');
  const h1 = all.filter((w) => w.hskLevel === 1);
  if (h1.length !== 300) {
    throw new Error(`Kỳ vọng 300 từ HSK1 trong words.seed.json, thấy ${h1.length}`);
  }

  // Upsert lại toàn bộ Lesson (idempotent) — hàm này tự tạo/tự cập nhật title+wordCount.
  const lessonMap = await seedLessons(prisma, all);

  let updated = 0;
  let notFound = 0;
  for (const w of h1) {
    const lessonId = lessonMap.get(`1:${w.lessonIndex}`);
    if (!lessonId) throw new Error(`Không có lessonId cho lessonIndex=${w.lessonIndex}`);
    const res = await prisma.word.updateMany({
      where: { simplified: w.simplified, pinyinNumeric: w.pinyinNumeric.toLowerCase() },
      data: { lessonId, lessonOrder: w.lessonOrder ?? null },
    });
    if (res.count === 0) notFound += 1;
    updated += res.count;
  }
  console.log(`✓ Đã cập nhật lessonId/lessonOrder cho ${updated} dòng Word (HSK1)`);
  if (notFound) console.log(`⚠ ${notFound} từ trong words.seed.json không khớp Word nào trong DB`);

  // Dọn Lesson HSK1 cũ không còn từ nào trỏ tới (phòng trường hợp số bài học mới ít hơn cũ).
  const maxIdx = Math.max(...h1.map((w) => w.lessonIndex ?? 0));
  const orphans = await prisma.lesson.findMany({
    where: { hskLevel: 1, orderIndex: { gt: maxIdx } },
    select: { id: true, orderIndex: true, title: true },
  });
  for (const o of orphans) {
    const stillUsed = await prisma.word.count({ where: { lessonId: o.id } });
    if (stillUsed === 0) {
      await prisma.lesson.delete({ where: { id: o.id } });
      console.log(`  đã xoá bài học cũ không dùng nữa: #${o.orderIndex} "${o.title}"`);
    }
  }

  const finalCount = await prisma.lesson.count({ where: { hskLevel: 1 } });
  console.log(`✓ Tổng bài học HSK1 sau di trú: ${finalCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
