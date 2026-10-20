import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../database.config';
import { seedAchievements } from './achievements';
import { seedGrammar } from './grammar';
import { seedGrammarSyllabus } from './grammar-syllabus';
import { seedHskLevels } from './hsk-levels';
import { seedLessons } from './lessons';
import { seedMeaningFixes } from './meaning-fixes';
import { seedVideos } from './videos';
import { seedWordExamples } from './word-examples';
import { loadWordSeed, seedWords } from './words';

/**
 * Seed dữ liệu tĩnh của Hanni cho DB MỚI — `npm run db:migrate && npm run db:seed`. KHÔNG đụng dữ liệu
 * người dùng. Chạy lại an toàn (upsert / bỏ qua trùng).
 *
 * Thứ tự: HskLevel → Achievement → Lesson → Word (Word tham chiếu HskLevel + Lesson) → nghĩa soạn tay →
 * câu ví dụ → ngữ pháp → video. Video tải phụ đề từ YouTube (chậm, cần mạng): `SEED_SKIP_VIDEOS=true` để bỏ.
 */
async function main(): Promise<void> {
  const db = await new DataSource(
    databaseOptions(process.env.DATABASE_URL ?? ''),
  ).initialize();
  console.log('Seeding Hanni…');
  await seedHskLevels(db);
  await seedAchievements(db);

  const words = loadWordSeed();
  if (!words) {
    console.log(
      '  ⚠ Chưa có data/processed/words.seed.json — bỏ qua từ vựng + bài học.',
    );
    console.log(
      '    Chạy: npm run data:fetch-sources && npm run data:build-words',
    );
  } else {
    const lessonMap = await seedLessons(db, words);
    await seedWords(db, words, lessonMap);
    await seedMeaningFixes(db);
    await seedWordExamples(db);
  }
  await seedGrammar(db);
  await seedGrammarSyllabus(db);
  if (process.env.SEED_SKIP_VIDEOS === 'true')
    console.log('  (SEED_SKIP_VIDEOS) bỏ qua video');
  else await seedVideos(db);
  await db.destroy();
  console.log('Xong.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
