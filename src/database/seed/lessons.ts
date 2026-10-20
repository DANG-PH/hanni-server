import type { DataSource } from 'typeorm';
import { Lesson } from '../entities';
import type { WordSeedRecord } from './words';

export type LessonMap = Map<string, string>; // "hskLevel:lessonIndex" -> lessonId

/**
 * Tạo bảng Lesson từ words.seed.json (đã có lessonIndex/lessonOrder do ETL gán).
 * Trả về map để seedWords gắn lessonId cho từng từ.
 */
export async function seedLessons(
  db: DataSource,
  records: WordSeedRecord[],
): Promise<LessonMap> {
  const lessons = db.getRepository(Lesson);
  const counts = new Map<
    string,
    { hskLevel: number; orderIndex: number; n: number; title?: string }
  >();
  for (const w of records) {
    if (!w.lessonIndex) continue;
    const key = `${w.hskLevel}:${w.lessonIndex}`;
    const c = counts.get(key) ?? {
      hskLevel: w.hskLevel,
      orderIndex: w.lessonIndex,
      n: 0,
      title: w.lessonTitle,
    };
    c.n += 1;
    counts.set(key, c);
  }

  const map: LessonMap = new Map();
  for (const [key, c] of [...counts.entries()].sort()) {
    const title = c.title ?? `Bài ${c.orderIndex}`;
    // Có rồi (cùng cấp + số thứ tự) thì cập nhật tên + số từ.
    await lessons.upsert(
      {
        hskLevel: c.hskLevel,
        orderIndex: c.orderIndex,
        title,
        wordCount: c.n,
      },
      ['hskLevel', 'orderIndex'],
    );
    const lesson = await lessons.findOneByOrFail({
      hskLevel: c.hskLevel,
      orderIndex: c.orderIndex,
    });
    map.set(key, lesson.id);
  }
  console.log(`  ✓ ${map.size} bài học`);
  return map;
}
