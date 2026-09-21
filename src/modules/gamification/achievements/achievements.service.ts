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
   * luôn cho nhóm LEVEL — NHƯNG bản ghi này chỉ được tạo khi user đã ôn ít
   * nhất 1 từ ở cấp đó, nên user hoàn toàn chưa động vào cấp nào sẽ không
   * có dòng nào cả; fallback sang đếm thẳng `Word` theo cấp (giống cách
   * ProgressService.overview() tính totalWords) thay vì lấy nhầm SỐ CẤP
   * (`threshold`, 1-9) làm mẫu số — bug thật đã gặp khi test (hiện "0/1"
   * thay vì "0/300" cho HSK 1 lúc chưa học gì). */
  async list(userId: string) {
    const [
      catalog,
      mine,
      streak,
      learnedWordsCount,
      levelProgress,
      totalByLevel,
      reviewCount,
    ] = await Promise.all([
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
      this.prisma.word.groupBy({ by: ['hskLevel'], _count: { _all: true } }),
      this.prisma.reviewLog.count({ where: { userId } }),
    ]);
    const unlocked = new Map(mine.map((m) => [m.achievementId, m]));
    const levelMap = new Map(levelProgress.map((l) => [l.hskLevel, l]));
    const totalWordsMap = new Map(
      totalByLevel.map((g) => [g.hskLevel, g._count._all]),
    );

    return catalog.map((a) => {
      let progressCurrent = 0;
      let progressTarget = a.threshold;
      if (a.category === AchievementCategory.STREAK) {
        progressCurrent = streak?.currentStreak ?? 0;
      } else if (a.category === AchievementCategory.VOLUME) {
        progressCurrent = learnedWordsCount;
      } else if (a.category === AchievementCategory.MILESTONE) {
        progressCurrent = reviewCount;
      } else if (a.category === AchievementCategory.LEVEL) {
        // threshold ở nhóm LEVEL là SỐ CẤP HSK (1-9), không phải số từ.
        const lp = levelMap.get(a.threshold);
        progressCurrent = lp?.learnedWords ?? 0;
        progressTarget =
          lp?.totalWords ?? totalWordsMap.get(a.threshold) ?? a.threshold;
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

  /** Ngưỡng lấy THẲNG từ ACHIEVEMENT_CATALOG thay vì chép tay — trước đây
   * hardcode [7,30,100]/[50,100,500,1000] ở 2 hàm dưới, thêm huy hiệu mới vào
   * catalog mà quên sửa 2 mảng này thì huy hiệu đó vĩnh viễn không mở khoá
   * được (im lặng, không lỗi gì). */
  private thresholdsOf(category: AchievementCategory): number[] {
    return ACHIEVEMENT_CATALOG.filter((a) => a.category === category)
      .map((a) => a.threshold)
      .sort((a, b) => a - b);
  }

  /** Gọi khi có sự kiện streak.updated. */
  async onStreakUpdated(userId: string, currentStreak: number): Promise<void> {
    for (const t of this.thresholdsOf(AchievementCategory.STREAK)) {
      if (currentStreak >= t)
        await this.unlock(userId, `STREAK_${t}`, currentStreak);
    }
  }

  /** Gọi khi có sự kiện level.completed. */
  async onLevelCompleted(userId: string, hskLevel: number): Promise<void> {
    await this.unlock(userId, `HSK${hskLevel}_COMPLETE`, hskLevel);
  }

  /** Gọi khi có sự kiện word.reviewed — kiểm mốc số từ đã thuộc (VOLUME) VÀ
   * tổng số lượt ôn (MILESTONE). MILESTONE là nhóm cho người MỚI: đếm thẳng
   * `ReviewLog` nên tăng ngay từ lượt ôn đầu tiên, trong khi VOLUME đo
   * `learnedAt` (cần interval >= 21 ngày) nên luôn trễ hàng tuần. */
  async onWordReviewed(userId: string): Promise<void> {
    const [learned, reviews] = await Promise.all([
      this.prisma.userWordProgress.count({
        where: { userId, learnedAt: { not: null } },
      }),
      this.prisma.reviewLog.count({ where: { userId } }),
    ]);
    for (const t of this.thresholdsOf(AchievementCategory.VOLUME)) {
      if (learned >= t) await this.unlock(userId, `WORDS_${t}`, learned);
    }
    for (const t of this.thresholdsOf(AchievementCategory.MILESTONE)) {
      if (reviews >= t) await this.unlock(userId, `REVIEWS_${t}`, reviews);
    }
  }

  /** Danh mục seed mặc định (giữ để tương thích chỗ gọi cũ). */
  static catalog() {
    return ACHIEVEMENT_CATALOG;
  }
}
