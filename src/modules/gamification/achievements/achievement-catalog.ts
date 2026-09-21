import { AchievementCategory } from '@prisma/client';

export interface AchievementSeed {
  code: string;
  nameVi: string;
  descriptionVi: string;
  category: AchievementCategory;
  threshold: number;
}

/** Danh mục huy hiệu mặc định — dùng chung cho service và seed script.
 *
 * LƯU Ý THIẾT KẾ (sửa 2026-09-21, sau khi đo dữ liệu production thật):
 * trước đây mốc THẤP NHẤT là streak 7 ngày / 50 từ "đã thuộc", mà "đã thuộc"
 * nghĩa là SRS đẩy khoảng ôn lên >= LEARNED_INTERVAL_DAYS (21 ngày) — nên
 * người mới KHÔNG THỂ nhận huy hiệu nào trong 3 tuần đầu dù học chăm tới đâu.
 * Kết quả đo thật: 0/102 user từng mở khoá huy hiệu, streak dài nhất từng đạt
 * trong lịch sử app chỉ 3 ngày (< ngưỡng 7). Vì vậy bổ sung các mốc SỚM để
 * người học nhận được phần thưởng đầu tiên NGAY TRONG PHIÊN ĐẦU:
 * - STREAK_1 mở khoá ngay khi học xong buổi đầu tiên (streak = 1).
 * - Nhóm MILESTONE đo TỔNG SỐ LƯỢT ÔN (ReviewLog) — tăng ngay từ lượt đầu,
 *   khác nhóm VOLUME vốn đo "từ đã thuộc" nên luôn trễ ít nhất 21 ngày.
 */
export const ACHIEVEMENT_CATALOG: AchievementSeed[] = (() => {
  const items: AchievementSeed[] = [
    {
      code: 'REVIEWS_1',
      nameVi: 'Bước đầu tiên',
      descriptionVi: 'Ôn từ vựng đầu tiên của bạn',
      category: AchievementCategory.MILESTONE,
      threshold: 1,
    },
    {
      code: 'REVIEWS_10',
      nameVi: 'Khởi động',
      descriptionVi: 'Hoàn thành 10 lượt ôn từ vựng',
      category: AchievementCategory.MILESTONE,
      threshold: 10,
    },
    {
      code: 'REVIEWS_50',
      nameVi: 'Vào nhịp',
      descriptionVi: 'Hoàn thành 50 lượt ôn từ vựng',
      category: AchievementCategory.MILESTONE,
      threshold: 50,
    },
    {
      code: 'REVIEWS_200',
      nameVi: 'Bền bỉ',
      descriptionVi: 'Hoàn thành 200 lượt ôn từ vựng',
      category: AchievementCategory.MILESTONE,
      threshold: 200,
    },
    {
      code: 'STREAK_1',
      nameVi: 'Ngày đầu tiên',
      descriptionVi: 'Hoàn thành ngày học đầu tiên',
      category: AchievementCategory.STREAK,
      threshold: 1,
    },
    {
      code: 'STREAK_3',
      nameVi: 'Chuỗi 3 ngày',
      descriptionVi: 'Học liên tục 3 ngày',
      category: AchievementCategory.STREAK,
      threshold: 3,
    },
    {
      code: 'STREAK_7',
      nameVi: 'Chuỗi 7 ngày',
      descriptionVi: 'Học liên tục 7 ngày',
      category: AchievementCategory.STREAK,
      threshold: 7,
    },
    {
      code: 'STREAK_30',
      nameVi: 'Chuỗi 30 ngày',
      descriptionVi: 'Học liên tục 30 ngày',
      category: AchievementCategory.STREAK,
      threshold: 30,
    },
    {
      code: 'STREAK_100',
      nameVi: 'Chuỗi 100 ngày',
      descriptionVi: 'Học liên tục 100 ngày',
      category: AchievementCategory.STREAK,
      threshold: 100,
    },
    {
      code: 'WORDS_10',
      nameVi: 'Thuộc 10 từ',
      descriptionVi: 'Đưa 10 từ vào trạng thái đã thuộc',
      category: AchievementCategory.VOLUME,
      threshold: 10,
    },
    {
      code: 'WORDS_25',
      nameVi: 'Thuộc 25 từ',
      descriptionVi: 'Đưa 25 từ vào trạng thái đã thuộc',
      category: AchievementCategory.VOLUME,
      threshold: 25,
    },
    {
      code: 'WORDS_50',
      nameVi: 'Thuộc 50 từ',
      descriptionVi: 'Đưa 50 từ vào trạng thái đã thuộc',
      category: AchievementCategory.VOLUME,
      threshold: 50,
    },
    {
      code: 'WORDS_100',
      nameVi: 'Thuộc 100 từ',
      descriptionVi: 'Đưa 100 từ vào trạng thái đã thuộc',
      category: AchievementCategory.VOLUME,
      threshold: 100,
    },
    {
      code: 'WORDS_500',
      nameVi: 'Thuộc 500 từ',
      descriptionVi: 'Đưa 500 từ vào trạng thái đã thuộc',
      category: AchievementCategory.VOLUME,
      threshold: 500,
    },
    {
      code: 'WORDS_1000',
      nameVi: 'Thuộc 1000 từ',
      descriptionVi: 'Đưa 1000 từ vào trạng thái đã thuộc',
      category: AchievementCategory.VOLUME,
      threshold: 1000,
    },
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
