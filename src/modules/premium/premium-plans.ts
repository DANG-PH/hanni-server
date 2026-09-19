export interface PremiumPlan {
  key: string;
  name: string;
  /** Số tháng cộng thêm — null = gói trọn đời. */
  months: number | null;
  priceVnd: number;
  /** Giá gốc để hiện gạch ngang (giảm giá) — tuỳ chọn. */
  originalPriceVnd?: number;
  badge?: string;
}

/**
 * Bảng giá Premium — GIÁ THAM KHẢO, người dùng tự điều chỉnh theo quan sát
 * thực tế sau khi ra mắt (đổi ngay ở đây, không cần sửa gì khác). Cố tình
 * định giá THẤP hơn nhiều so với app đối thủ tham khảo lúc thiết kế (vốn
 * khoá cả nội dung học HSK2-9) vì Premium ở Hanni CHỈ mở thêm tiện ích
 * (trợ lý AI không giới hạn, khung avatar độc quyền...), KHÔNG khoá bất kỳ
 * nội dung học nào — xem `hanni-server/CLAUDE.md` mục "Premium".
 */
export const PREMIUM_PLANS: PremiumPlan[] = [
  { key: 'month', name: 'Premium tháng', months: 1, priceVnd: 19_000 },
  {
    key: 'quarter',
    name: 'Premium 3 tháng',
    months: 3,
    priceVnd: 49_000,
    originalPriceVnd: 57_000,
  },
  {
    key: 'half_year',
    name: 'Premium 6 tháng',
    months: 6,
    priceVnd: 89_000,
    originalPriceVnd: 114_000,
    badge: 'Phổ biến nhất',
  },
  {
    key: 'year',
    name: 'Premium năm',
    months: 12,
    priceVnd: 149_000,
    originalPriceVnd: 228_000,
    badge: 'Tiết kiệm nhất',
  },
  {
    key: 'lifetime',
    name: 'Premium trọn đời',
    months: null,
    priceVnd: 399_000,
  },
];

/** Mốc xa dùng làm "không bao giờ hết hạn" cho gói trọn đời — tránh phải
 * thêm cột boolean riêng, mọi chỗ chỉ cần so `premiumUntil > now()`. */
export const PREMIUM_LIFETIME_UNTIL = new Date('2099-12-31T00:00:00.000Z');

export function isPremiumActive(premiumUntil: Date | null): boolean {
  return !!premiumUntil && premiumUntil.getTime() > Date.now();
}

export function isLifetimePremium(premiumUntil: Date | null): boolean {
  return premiumUntil?.getTime() === PREMIUM_LIFETIME_UNTIL.getTime();
}

/** Cộng dồn thời hạn Premium theo gói vừa mua. Nếu đang Premium (chưa hết
 * hạn) thì NỐI TIẾP từ hạn cũ thay vì tính lại từ hôm nay — giống chuẩn gia
 * hạn subscription thông thường, không "mất" thời gian đã trả trước đó. */
export function extendPremiumUntil(
  current: Date | null,
  planKey: string,
): Date {
  const plan = PREMIUM_PLANS.find((p) => p.key === planKey);
  if (!plan) throw new Error(`Không tìm thấy gói Premium: ${planKey}`);
  if (plan.months === null) return PREMIUM_LIFETIME_UNTIL;

  const base = isPremiumActive(current) ? current! : new Date();
  const next = new Date(base);
  next.setMonth(next.getMonth() + plan.months);
  return next;
}
