import type { DataSource } from 'typeorm';
import { ACHIEVEMENT_CATALOG } from '../../modules/gamification/achievements/achievement-catalog';
import { Achievement } from '../entities';

export async function seedAchievements(db: DataSource): Promise<void> {
  // Có rồi (trùng code) thì cập nhật tên, mô tả, nhóm, ngưỡng.
  await db.getRepository(Achievement).upsert(ACHIEVEMENT_CATALOG, ['code']);
  console.log(`  ✓ ${ACHIEVEMENT_CATALOG.length} huy hiệu`);
}
