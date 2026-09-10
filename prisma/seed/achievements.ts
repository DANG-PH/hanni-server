import { PrismaClient } from '@prisma/client';
import { AchievementsService } from '../../src/modules/gamification/achievements/achievements.service';

export async function seedAchievements(prisma: PrismaClient): Promise<void> {
  const catalog = AchievementsService.catalog();
  for (const a of catalog) {
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
  console.log(`  ✓ ${catalog.length} huy hiệu`);
}
