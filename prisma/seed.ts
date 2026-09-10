import { PrismaClient } from '@prisma/client';
import { seedAchievements } from './seed/achievements';
import { seedHskLevels } from './seed/hsk-levels';
import { seedWords } from './seed/words';

const prisma = new PrismaClient();

/**
 * Seed dữ liệu tĩnh của Hanni. KHÔNG đụng dữ liệu người dùng.
 * Idempotent: chạy lại nhiều lần vẫn an toàn (dùng upsert).
 *
 * Thứ tự bắt buộc: HskLevel → Achievement → Word (Word tham chiếu HskLevel).
 */
async function main(): Promise<void> {
  console.log('Seeding Hanni…');
  await seedHskLevels(prisma);
  await seedAchievements(prisma);
  await seedWords(prisma);
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
