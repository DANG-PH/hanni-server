export interface AvatarFrame {
  key: string;
  name: string;
  /** 2 màu để FE vẽ viền gradient quanh avatar — gửi màu từ server (không
   * chép tay lại ở client) giống đúng cách `LeagueTier.color` đã làm. */
  colors: [string, string];
}

/**
 * Khung avatar — chỉ còn khung Phượng Hoàng, quyền lợi của Premium (tự có khi
 * đang Premium, mất quyền dùng khi hết hạn). 4 khung mua bằng xu (Ngọc Bích,
 * Hoàng Kim, Lửa Hồng, Rồng Thiêng) ĐÃ BỎ 2026-10-17: user nhận xét khung mua
 * bằng xu "vô nghĩa với việc học" — thay bằng danh hiệu mở theo thành tích học
 * thật (`title-catalog.ts`); ai đã mua được hoàn xu trong migration
 * `20261017130000_earned_titles`.
 */
export const AVATAR_FRAMES: AvatarFrame[] = [
  { key: 'phoenix', name: 'Phượng Hoàng', colors: ['#8a4fbf', '#f0d078'] },
];
