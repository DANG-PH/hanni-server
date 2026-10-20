import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Achievement,
  UserAchievement,
  UserSettings,
} from '../../database/entities';
import { TITLE_CATALOG, type Title } from './title-catalog';

export interface TitleCatalogItem extends Title {
  /** Điều kiện của huy hiệu cần đạt ("Học liên tục 7 ngày") — hiện cho danh hiệu chưa mở. */
  requirement: string;
  owned: boolean;
  equipped: boolean;
}

/** Danh hiệu mở theo huy hiệu đã đạt (xem `title-catalog.ts`). */
@Injectable()
export class TitleService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievements: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievements: Repository<UserAchievement>,
    @InjectRepository(UserSettings)
    private readonly settings: Repository<UserSettings>,
  ) {}

  async getCatalog(userId: string): Promise<{ titles: TitleCatalogItem[] }> {
    const [unlocked, achievements, settings] = await Promise.all([
      this.unlockedCodes(userId),
      this.achievements.find({
        where: { code: In(TITLE_CATALOG.map((t) => t.achievementCode)) },
        select: { id: true, code: true, descriptionVi: true },
      }),
      this.settings.findOne({
        where: { userId },
        select: { userId: true, equippedTitle: true },
      }),
    ]);
    const conditionOf = new Map(
      achievements.map((a) => [a.code, a.descriptionVi]),
    );
    return {
      titles: TITLE_CATALOG.map((title) => ({
        ...title,
        requirement:
          conditionOf.get(title.achievementCode) ?? title.achievementCode,
        owned: unlocked.has(title.achievementCode),
        equipped: settings?.equippedTitle === title.key,
      })),
    };
  }

  /** `titleKey: null` = bỏ danh hiệu. */
  async equip(userId: string, titleKey: string | null): Promise<void> {
    if (titleKey !== null) {
      const title = TITLE_CATALOG.find((t) => t.key === titleKey);
      if (!title) throw new BadRequestException('Không tìm thấy danh hiệu này');
      const unlocked = await this.unlockedCodes(userId);
      if (!unlocked.has(title.achievementCode)) {
        throw new BadRequestException(
          'Đạt huy hiệu tương ứng mới dùng được danh hiệu này',
        );
      }
    }
    await this.settings.update({ userId }, { equippedTitle: titleKey });
  }

  private async unlockedCodes(userId: string): Promise<Set<string>> {
    const rows = await this.userAchievements.find({
      where: { userId },
      relations: { achievement: true },
      select: { id: true, achievement: { id: true, code: true } },
    });
    return new Set(rows.map((r) => r.achievement.code));
  }
}
