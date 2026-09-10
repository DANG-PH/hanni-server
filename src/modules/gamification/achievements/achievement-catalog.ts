import { AchievementCategory } from '@prisma/client';

export interface AchievementSeed {
  code: string;
  nameVi: string;
  descriptionVi: string;
  category: AchievementCategory;
  threshold: number;
}

/** Danh mục huy hiệu mặc định — dùng chung cho service và seed script. */
export const ACHIEVEMENT_CATALOG: AchievementSeed[] = (() => {
  const items: AchievementSeed[] = [
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
})();
