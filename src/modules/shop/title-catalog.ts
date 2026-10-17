export interface Title {
  key: string;
  label: string;
  /** Mã huy hiệu (`achievement-catalog.ts`) phải đạt mới dùng được danh hiệu. */
  achievementCode: string;
}

/**
 * Danh hiệu hiện cạnh tên trên hồ sơ công khai — MỞ THEO THÀNH TÍCH HỌC THẬT
 * (huy hiệu đã đạt), không mua được. Trước 2026-10-17 danh hiệu mua đứt bằng
 * xu nên mua được "Bậc thầy từ vựng" mà chưa thuộc từ nào; user yêu cầu thay
 * khung/danh hiệu mua bằng xu bằng thứ "có giá trị với việc học (huy hiệu thành
 * tích, chuỗi ngày học, danh hiệu…)". Gắn vào huy hiệu sẵn có nên không cần
 * theo dõi thêm gì: đạt huy hiệu là dùng được danh hiệu. Danh hiệu đầu tiên mở
 * ngay ngày học đầu để người mới thấy cơ chế này sớm.
 */
export const TITLE_CATALOG: Title[] = [
  { key: 'rookie', label: 'Tân binh', achievementCode: 'STREAK_1' },
  { key: 'diligent', label: 'Chăm chỉ', achievementCode: 'STREAK_7' },
  { key: 'persistent', label: 'Kiên trì', achievementCode: 'STREAK_30' },
  { key: 'legend', label: 'Huyền thoại', achievementCode: 'STREAK_100' },
  { key: 'bookworm', label: 'Mọt sách', achievementCode: 'REVIEWS_200' },
  {
    key: 'rising_star',
    label: 'Ngôi sao mới nổi',
    achievementCode: 'WORDS_100',
  },
  {
    key: 'vocab_master',
    label: 'Bậc thầy từ vựng',
    achievementCode: 'WORDS_1000',
  },
  {
    key: 'hsk1_graduate',
    label: 'Nhập môn HSK',
    achievementCode: 'HSK1_COMPLETE',
  },
  {
    key: 'hsk3_graduate',
    label: 'Vững HSK 3',
    achievementCode: 'HSK3_COMPLETE',
  },
];
