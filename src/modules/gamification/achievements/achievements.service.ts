import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AchievementCategory } from '@prisma/client';
import { AppEvent } from '../../../events/events';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ACHIEVEMENT_CATALOG } from './achievement-catalog';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Kèm tiến độ hiện tại cho huy hiệu CHƯA mở khoá (vd "37/50 từ", "5/7
   * ngày") — trước đây chỉ báo "Đang chinh phục" chung chung, không biết
   * còn cách bao xa. `UserLevelProgress` đã có sẵn cache totalWords/
   * learnedWords theo từng cấp (duy trì bởi ProgressService) nên tái dùng
   * luôn cho nhóm LEVEL, không cần tính lại. */
  async list(userId: string) {
    const [catalog, mine, streak, learnedWordsCount, levelProgress] =
      await Promise.all([
        this.prisma.achievement.findMany({ orderBy: { threshold: 'asc' } }),
        this.prisma.userAchievement.findMany({ where: { userId } }),
        this.prisma.userStreak.findUnique({ where: { userId } }),
        this.prisma.userWordProgress.count({
          where: { userId, learnedAt: { not: null } },
        }),
        this.prisma.userLevelProgress.findMany({
          where: { userId },
          select: { hskLevel: true, learnedWords: true, totalWords: true },
        }),
      ]);
    const unlocked = new Map(mine.map((m) => [m.achievementId, m]));
    const levelMap = new Map(levelProgress.map((l) => [l.hskLevel, l]));

    return catalog.map((a) => {
      let progressCurrent = 0;
      let progressTarget = a.threshold;
      if (a.category === AchievementCategory.STREAK) {
        progressCurrent = streak?.currentStreak ?? 0;
      } else if (a.category === AchievementCategory.VOLUME) {
        progressCurrent = learnedWordsCount;
      } else if (a.category === AchievementCategory.LEVEL) {
        // threshold ở nhóm LEVEL là SỐ CẤP HSK (1-9), không phải số từ.
        const lp = levelMap.get(a.threshold);
        progressCurrent = lp?.learnedWords ?? 0;
        progressTarget = lp?.totalWords ?? a.threshold;
      }
      return {
        ...a,
        unlocked: unlocked.has(a.id),
        unlockedAt: unlocked.get(a.id)?.unlockedAt ?? null,
        progressCurrent,
        progressTarget,
      };
    });
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
      this.events.emit(AppEvent.AchievementUnlocked, {
        userId,
        achievementId: achievement.id,
      });
      return true;
    } catch {
      return false; // đã có rồi (unique)
    }
  }

  /** Gọi khi có sự kiện streak.updated. */
  async onStreakUpdated(userId: string, currentStreak: number): Promise<void> {
    for (const t of [7, 30, 100]) {
      if (currentStreak >= t)
        await this.unlock(userId, `STREAK_${t}`, currentStreak);
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
