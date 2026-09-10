import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ACHIEVEMENT_CATALOG } from './achievement-catalog';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [catalog, mine] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { threshold: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { userId } }),
    ]);
    const unlocked = new Map(mine.map((m) => [m.achievementId, m]));
    return catalog.map((a) => ({
      ...a,
      unlocked: unlocked.has(a.id),
      unlockedAt: unlocked.get(a.id)?.unlockedAt ?? null,
    }));
  }

  private async unlock(
    userId: string,
    code: string,
    progressValue = 0,
  ): Promise<boolean> {
    const achievement = await this.prisma.achievement.findUnique({
      where: { code },
    });
    if (!achievement) return false;
    try {
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id, progressValue },
      });
      this.logger.log(`User ${userId} mở khoá huy hiệu ${code}`);
      return true;
    } catch {
      return false; // đã có rồi (unique)
    }
  }

  /** Gọi khi có sự kiện streak.updated. */
  async onStreakUpdated(userId: string, currentStreak: number): Promise<void> {
    for (const t of [7, 30, 100]) {
      if (currentStreak >= t) await this.unlock(userId, `STREAK_${t}`, currentStreak);
    }
  }

  /** Gọi khi có sự kiện level.completed. */
  async onLevelCompleted(userId: string, hskLevel: number): Promise<void> {
    await this.unlock(userId, `HSK${hskLevel}_COMPLETE`, hskLevel);
  }

  /** Gọi khi có sự kiện word.reviewed — kiểm mốc số từ đã thuộc. */
  async onWordReviewed(userId: string): Promise<void> {
    const learned = await this.prisma.userWordProgress.count({
      where: { userId, learnedAt: { not: null } },
    });
    for (const t of [50, 100, 500, 1000]) {
      if (learned >= t) await this.unlock(userId, `WORDS_${t}`, learned);
    }
  }

  /** Danh mục seed mặc định (giữ để tương thích chỗ gọi cũ). */
  static catalog() {
    return ACHIEVEMENT_CATALOG;
  }
}
