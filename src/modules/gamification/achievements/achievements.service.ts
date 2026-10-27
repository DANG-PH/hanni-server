import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  Achievement,
  ReviewLog,
  UserAchievement,
  UserLevelProgress,
  UserStreak,
  UserWordProgress,
  Word,
} from '../../../database/entities';
import { AchievementCategory } from '../../../database/enums';
import { insertIfAbsent } from '../../../database/repository.util';
import { AppEvent } from '../../../events/events';
import { ACHIEVEMENT_CATALOG } from './achievement-catalog';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievements: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievements: Repository<UserAchievement>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    @InjectRepository(UserWordProgress)
    private readonly wordProgress: Repository<UserWordProgress>,
    @InjectRepository(UserLevelProgress)
    private readonly levelProgress: Repository<UserLevelProgress>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(ReviewLog)
    private readonly reviewLogs: Repository<ReviewLog>,
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
      this.achievements.find({ order: { threshold: 'ASC' } }),
      this.userAchievements.findBy({ userId }),
      this.streaks.findOneBy({ userId }),
      this.wordProgress.countBy({ userId, learnedAt: Not(IsNull()) }),
      this.levelProgress.find({
        where: { userId },
        select: {
          id: true,
          hskLevel: true,
          learnedWords: true,
          totalWords: true,
        },
      }),
      // Số từ mỗi cấp HSK.
      this.words
        .createQueryBuilder('word')
        .select('word.hskLevel', 'hskLevel')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('word.hskLevel')
        .getRawMany<{ hskLevel: number; count: number }>(),
      this.reviewLogs.countBy({ userId }),
    ]);
    const unlocked = new Map(mine.map((m) => [m.achievementId, m]));
    const levelMap = new Map(levelProgress.map((l) => [l.hskLevel, l]));
    const totalWordsMap = new Map(
      totalByLevel.map((g) => [g.hskLevel, g.count]),
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

  private async unlock(userId: string, code: string): Promise<boolean> {
    const achievement = await this.achievements.findOneBy({ code });
    if (!achievement) return false;
    const unlocked = await insertIfAbsent(this.userAchievements, {
      userId,
      achievementId: achievement.id,
    });
    if (!unlocked) return false; // đã có rồi
    this.logger.log(`User ${userId} mở khoá huy hiệu ${code}`);
    this.events.emit(AppEvent.AchievementUnlocked, {
      userId,
      achievementId: achievement.id,
    });
    return true;
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
      if (currentStreak >= t) await this.unlock(userId, `STREAK_${t}`);
    }
  }

  /** Gọi khi có sự kiện level.completed. */
  async onLevelCompleted(userId: string, hskLevel: number): Promise<void> {
    await this.unlock(userId, `HSK${hskLevel}_COMPLETE`);
  }

  /** Gọi khi có sự kiện word.reviewed — kiểm mốc số từ đã thuộc (VOLUME) VÀ
   * tổng số lượt ôn (MILESTONE). MILESTONE là nhóm cho người MỚI: đếm thẳng
   * `ReviewLog` nên tăng ngay từ lượt ôn đầu tiên, trong khi VOLUME đo
   * `learnedAt` (cần interval >= 21 ngày) nên luôn trễ hàng tuần. */
  async onWordReviewed(userId: string): Promise<void> {
    const [learned, reviews] = await Promise.all([
      this.wordProgress.countBy({ userId, learnedAt: Not(IsNull()) }),
      this.reviewLogs.countBy({ userId }),
    ]);
    for (const t of this.thresholdsOf(AchievementCategory.VOLUME)) {
      if (learned >= t) await this.unlock(userId, `WORDS_${t}`);
    }
    for (const t of this.thresholdsOf(AchievementCategory.MILESTONE)) {
      if (reviews >= t) await this.unlock(userId, `REVIEWS_${t}`);
    }
  }

  /** Danh mục seed mặc định (giữ để tương thích chỗ gọi cũ). */
  static catalog() {
    return ACHIEVEMENT_CATALOG;
  }
}
