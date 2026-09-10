import { Injectable, Logger } from '@nestjs/common';
import { AchievementCategory } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

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

  /** Danh mục seed mặc định. */
  static catalog(): {
    code: string;
    nameVi: string;
    descriptionVi: string;
    category: AchievementCategory;
    threshold: number;
  }[] {
    const items: {
      code: string;
      nameVi: string;
      descriptionVi: string;
      category: AchievementCategory;
      threshold: number;
    }[] = [
      { code: 'STREAK_7', nameVi: 'Chuỗi 7 ngày', descriptionVi: 'Học liên tục 7 ngày', category: AchievementCategory.STREAK, threshold: 7 },
      { code: 'STREAK_30', nameVi: 'Chuỗi 30 ngày', descriptionVi: 'Học liên tục 30 ngày', category: AchievementCategory.STREAK, threshold: 30 },
      { code: 'STREAK_100', nameVi: 'Chuỗi 100 ngày', descriptionVi: 'Học liên tục 100 ngày', category: AchievementCategory.STREAK, threshold: 100 },
      { code: 'WORDS_50', nameVi: 'Thuộc 50 từ', descriptionVi: 'Đưa 50 từ vào trạng thái đã thuộc', category: AchievementCategory.VOLUME, threshold: 50 },
      { code: 'WORDS_100', nameVi: 'Thuộc 100 từ', descriptionVi: 'Đưa 100 từ vào trạng thái đã thuộc', category: AchievementCategory.VOLUME, threshold: 100 },
      { code: 'WORDS_500', nameVi: 'Thuộc 500 từ', descriptionVi: 'Đưa 500 từ vào trạng thái đã thuộc', category: AchievementCategory.VOLUME, threshold: 500 },
      { code: 'WORDS_1000', nameVi: 'Thuộc 1000 từ', descriptionVi: 'Đưa 1000 từ vào trạng thái đã thuộc', category: AchievementCategory.VOLUME, threshold: 1000 },
    ];
    for (let lv = 1; lv <= 9; lv += 1) {
      items.push({
        code: `HSK${lv}_COMPLETE`,
        nameVi: `Hoàn thành HSK ${lv}`,
        descriptionVi: `Thuộc toàn bộ từ vựng cấp HSK ${lv}`,
        category: AchievementCategory.LEVEL,
        threshold: lv,
      });
    }
    return items;
  }
}
