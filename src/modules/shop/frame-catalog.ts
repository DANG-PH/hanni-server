export interface AvatarFrame {
  key: string;
  name: string;
  price: number;
  /** 2 màu để FE vẽ viền gradient quanh avatar — gửi màu từ server (không
   * chép tay lại ở client) giống đúng cách `LeagueTier.color` đã làm, tránh
   * lệch màu giữa 2 nơi khi thêm/sửa khung sau này. */
  colors: [string, string];
  /** true = khung ĐỘC QUYỀN Premium — không mua được bằng xu (`price` bỏ
   * qua), tự động "sở hữu" khi đang Premium, mất quyền dùng nếu hết hạn.
   * Xem `ShopService`. */
  premiumOnly?: boolean;
}

/**
 * Khung avatar — thuần trang trí, KHÔNG ảnh hưởng học tập hay xếp hạng, mua
 * đứt bằng xu (không phải rương/random reward — xu ở đây có thể nạp bằng
 * tiền thật qua payOS, gắn cơ chế may rủi vào tiền có thể quy đổi từ tiền
 * thật sẽ mang màu sắc loot-box nhạy cảm nên cố tình tránh). Đây là sink xu
 * THỨ HAI sau lá chắn streak (300 xu) — ví xu trước đây gần như không có gì
 * đáng mua thêm, mua đứt + hiện rõ trên hồ sơ công khai tạo động lực kiếm
 * xu (qua minigame/điểm danh/nhiệm vụ hàng ngày) mà không đụng cân bằng học
 * tập nào. Giá tăng dần tạo mục tiêu dài hơi hơn lá chắn streak.
 */
export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    key: 'jade',
    name: 'Ngọc Bích',
    price: 150,
    colors: ['#2f8f5b', '#7ecb9e'],
  },
  {
    key: 'gold',
    name: 'Hoàng Kim',
    price: 300,
    colors: ['#b5852f', '#f0d078'],
  },
  {
    key: 'crimson',
    name: 'Lửa Hồng',
    price: 500,
    colors: ['#dc3526', '#ff8f5c'],
  },
  {
    key: 'dragon',
    name: 'Rồng Thiêng',
    price: 800,
    colors: ['#dc3526', '#f0d078'],
  },
  {
    key: 'phoenix',
    name: 'Phượng Hoàng (Premium)',
    price: 0,
    colors: ['#8a4fbf', '#f0d078'],
    premiumOnly: true,
  },
];
