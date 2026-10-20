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
import { MoreThan } from 'typeorm';
import { Lesson, Word } from '../src/database/entities';
import { seedLessons } from '../src/database/seed/lessons';
import { loadWordSeed } from '../src/database/seed/words';
import { connect } from './db';

const CURATED_DIR = join(__dirname, '..', 'data', 'curated');

/** Các cấp cần di trú = cấp nào có sẵn file lesson-themes-hsk{level}.json. */
function levelsWithThemes(): number[] {
  const levels: number[] = [];
  for (let lv = 1; lv <= 9; lv += 1) {
    if (existsSync(join(CURATED_DIR, `lesson-themes-hsk${lv}.json`)))
      levels.push(lv);
  }
  return levels;
}

async function main() {
  const db = await connect();
  const wordRepo = db.getRepository(Word);
  const lessonRepo = db.getRepository(Lesson);
  const all = loadWordSeed();
  if (!all) throw new Error('Không đọc được data/processed/words.seed.json');

  const levels = levelsWithThemes();
  console.log(`Các cấp có file chủ đề: ${levels.join(', ')}`);

  // Upsert lại toàn bộ Lesson (idempotent, mọi cấp) — hàm này tự tạo/tự cập nhật title+wordCount.
  const lessonMap = await seedLessons(db, all);

  for (const level of levels) {
    const words = all.filter((w) => w.hskLevel === level);
    let updated = 0;
    let notFound = 0;
    for (const w of words) {
      const lessonId = lessonMap.get(`${level}:${w.lessonIndex}`);
      if (!lessonId)
        throw new Error(
          `Không có lessonId cho HSK${level} lessonIndex=${w.lessonIndex}`,
        );
      const res = await wordRepo.update(
        {
          simplified: w.simplified,
          pinyinNumeric: w.pinyinNumeric.toLowerCase(),
        },
        { lessonId, lessonOrder: w.lessonOrder ?? null },
      );
      if (!res.affected) notFound += 1;
      updated += res.affected ?? 0;
    }
    console.log(
      `✓ HSK${level}: đã cập nhật lessonId/lessonOrder cho ${updated}/${words.length} dòng Word`,
    );
    if (notFound)
      console.log(`  ⚠ ${notFound} từ không khớp Word nào trong DB`);

    // Dọn Lesson cũ của cấp này không còn từ nào trỏ tới (số bài học mới có thể ít hơn cũ).
    const maxIdx = Math.max(...words.map((w) => w.lessonIndex ?? 0));
    const orphans = await lessonRepo.find({
      where: { hskLevel: level, orderIndex: MoreThan(maxIdx) },
      select: { id: true, orderIndex: true, title: true },
    });
    for (const o of orphans) {
      const stillUsed = await wordRepo.countBy({ lessonId: o.id });
      if (stillUsed === 0) {
        await lessonRepo.delete(o.id);
        console.log(
          `  đã xoá bài học cũ không dùng nữa: #${o.orderIndex} "${o.title}"`,
        );
      }
    }

    const finalCount = await lessonRepo.countBy({ hskLevel: level });
    console.log(`  tổng bài học HSK${level} sau di trú: ${finalCount}`);
  }

  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
