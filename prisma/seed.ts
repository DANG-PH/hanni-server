import { PrismaClient } from '@prisma/client';
import { seedAchievements } from './seed/achievements';
import { seedGrammar } from './seed/grammar';
import { seedHskLevels } from './seed/hsk-levels';
import { seedLessons } from './seed/lessons';
import { seedVideos } from './seed/videos';
import { loadWordSeed, seedWords } from './seed/words';

const prisma = new PrismaClient();

/**
 * Seed dữ liệu tĩnh của Hanni. KHÔNG đụng dữ liệu người dùng.
 * Idempotent: chạy lại nhiều lần vẫn an toàn (dùng upsert / skipDuplicates).
 *
 * Thứ tự: HskLevel → Achievement → Lesson → Word (Word tham chiếu HskLevel + Lesson).
 */
async function main(): Promise<void> {
  console.log('Seeding Hanni…');
  await seedHskLevels(prisma);
  await seedAchievements(prisma);

  const words = loadWordSeed();
  if (!words) {
    console.log('  ⚠ Chưa có data/processed/words.seed.json — bỏ qua từ vựng + bài học.');
    console.log('    Chạy: npm run data:fetch-sources && npm run data:build-words');
  } else {
    const lessonMap = await seedLessons(prisma, words);
    await seedWords(prisma, words, lessonMap);
  }
  await seedGrammar(prisma);
  await seedVideos(prisma);
  console.log('Xong.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
