/**
 * Di trú MỘT LẦN: gán lại Word.lessonId/lessonOrder theo bài học chủ đề mới cho các
 * cấp đã có data/curated/lesson-themes-hsk{level}.json, áp dụng cho DB ĐÃ seed sẵn.
 *
 * KHÔNG xoá/tạo lại Word — chỉ cập nhật lessonId/lessonOrder trên các dòng đã có,
 * nên toàn bộ UserWordProgress/SRS của người dùng thật không bị ảnh hưởng.
 *
 * Chạy: npx tsx scripts/migrate-lesson-themes.ts
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedLessons } from '../prisma/seed/lessons';
import { loadWordSeed } from '../prisma/seed/words';

const CURATED_DIR = join(__dirname, '..', 'data', 'curated');

/** Các cấp cần di trú = cấp nào có sẵn file lesson-themes-hsk{level}.json. */
function levelsWithThemes(): number[] {
  const levels: number[] = [];
  for (let lv = 1; lv <= 9; lv += 1) {
    if (existsSync(join(CURATED_DIR, `lesson-themes-hsk${lv}.json`))) levels.push(lv);
  }
  return levels;
}

async function main() {
  const prisma = new PrismaClient();
  const all = loadWordSeed();
  if (!all) throw new Error('Không đọc được data/processed/words.seed.json');

  const levels = levelsWithThemes();
  console.log(`Các cấp có file chủ đề: ${levels.join(', ')}`);

  // Upsert lại toàn bộ Lesson (idempotent, mọi cấp) — hàm này tự tạo/tự cập nhật title+wordCount.
  const lessonMap = await seedLessons(prisma, all);

  for (const level of levels) {
    const words = all.filter((w) => w.hskLevel === level);
    let updated = 0;
    let notFound = 0;
    for (const w of words) {
      const lessonId = lessonMap.get(`${level}:${w.lessonIndex}`);
      if (!lessonId) throw new Error(`Không có lessonId cho HSK${level} lessonIndex=${w.lessonIndex}`);
      const res = await prisma.word.updateMany({
        where: { simplified: w.simplified, pinyinNumeric: w.pinyinNumeric.toLowerCase() },
        data: { lessonId, lessonOrder: w.lessonOrder ?? null },
      });
      if (res.count === 0) notFound += 1;
      updated += res.count;
    }
    console.log(`✓ HSK${level}: đã cập nhật lessonId/lessonOrder cho ${updated}/${words.length} dòng Word`);
    if (notFound) console.log(`  ⚠ ${notFound} từ không khớp Word nào trong DB`);

    // Dọn Lesson cũ của cấp này không còn từ nào trỏ tới (số bài học mới có thể ít hơn cũ).
    const maxIdx = Math.max(...words.map((w) => w.lessonIndex ?? 0));
    const orphans = await prisma.lesson.findMany({
      where: { hskLevel: level, orderIndex: { gt: maxIdx } },
      select: { id: true, orderIndex: true, title: true },
    });
    for (const o of orphans) {
      const stillUsed = await prisma.word.count({ where: { lessonId: o.id } });
      if (stillUsed === 0) {
        await prisma.lesson.delete({ where: { id: o.id } });
        console.log(`  đã xoá bài học cũ không dùng nữa: #${o.orderIndex} "${o.title}"`);
      }
    }

    const finalCount = await prisma.lesson.count({ where: { hskLevel: level } });
    console.log(`  tổng bài học HSK${level} sau di trú: ${finalCount}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
