import { PrismaClient } from '@prisma/client';
import type { WordSeedRecord } from './words';

export type LessonMap = Map<string, string>; // "hskLevel:lessonIndex" -> lessonId

/**
 * Tạo bảng Lesson từ words.seed.json (đã có lessonIndex/lessonOrder do ETL gán).
 * Trả về map để seedWords gắn lessonId cho từng từ.
 */
export async function seedLessons(
  prisma: PrismaClient,
  records: WordSeedRecord[],
): Promise<LessonMap> {
  const counts = new Map<string, { hskLevel: number; orderIndex: number; n: number }>();
  for (const w of records) {
    if (!w.lessonIndex) continue;
    const key = `${w.hskLevel}:${w.lessonIndex}`;
    const c = counts.get(key) ?? {
      hskLevel: w.hskLevel,
      orderIndex: w.lessonIndex,
      n: 0,
    };
    c.n += 1;
    counts.set(key, c);
  }

  const map: LessonMap = new Map();
  for (const [key, c] of [...counts.entries()].sort()) {
    const lesson = await prisma.lesson.upsert({
      where: {
        hskLevel_orderIndex: { hskLevel: c.hskLevel, orderIndex: c.orderIndex },
      },
      create: {
        hskLevel: c.hskLevel,
        orderIndex: c.orderIndex,
        title: `Bài ${c.orderIndex}`,
        wordCount: c.n,
      },
      update: { wordCount: c.n },
    });
    map.set(key, lesson.id);
  }
  console.log(`  ✓ ${map.size} bài học`);
  return map;
}
