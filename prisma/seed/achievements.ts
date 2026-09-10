import { PrismaClient } from '@prisma/client';
import { ACHIEVEMENT_CATALOG } from '../../src/modules/gamification/achievements/achievement-catalog';

export async function seedAchievements(prisma: PrismaClient): Promise<void> {
  for (const a of ACHIEVEMENT_CATALOG) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: a,
      update: {
        nameVi: a.nameVi,
        descriptionVi: a.descriptionVi,
        category: a.category,
        threshold: a.threshold,
      },
    });
  }
  console.log(`  ✓ ${ACHIEVEMENT_CATALOG.length} huy hiệu`);
}
