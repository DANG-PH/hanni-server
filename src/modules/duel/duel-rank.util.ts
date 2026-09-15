/**
 * Rank tier theo ELO — tham khảo hệ rank Liên Minh Huyền Thoại (Sắt → Thách
 * Đấu) nhưng KHÔNG chia division (I-IV) vì lượng người chơi ban đầu còn nhỏ,
 * chia nhỏ nữa sẽ không đủ người mỗi bậc để có ý nghĩa. Ngưỡng ELO là ước
 * lượng ban đầu — cần chỉnh lại theo phân phối ELO thật sau vài mùa.
 */
export interface RankTier {
  name: string;
  min: number;
  /** dùng cho UI: màu + icon theo tier */
  color: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: 'Sắt', min: 0, color: '#8d8378' },
  { name: 'Đồng', min: 800, color: '#b56a45' },
  { name: 'Bạc', min: 1000, color: '#9aa5b1' },
  { name: 'Vàng', min: 1200, color: '#d4af37' },
  { name: 'Bạch Kim', min: 1400, color: '#4fb0a5' },
  { name: 'Kim Cương', min: 1600, color: '#5a8dee' },
  { name: 'Cao Thủ', min: 1800, color: '#a355e0' },
  { name: 'Đại Cao Thủ', min: 2000, color: '#e0558a' },
  { name: 'Thách Đấu', min: 2200, color: '#f2b134' },
];

/** Thách Đấu — không chỉ cần đủ ELO mà còn phải nằm trong top N toàn
 * server, giống Challenger/Cao Thủ Vinh Danh của các game xếp hạng khác
 * (LMHL, LMHT...) — tránh trường hợp "ai cũng thành Thách Đấu" nếu ELO
 * trung bình cả server tăng dần theo thời gian. */
export const CHALLENGER_TOP_N = 100;

export function tierForElo(elo: number): RankTier {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (elo >= t.min) tier = t;
  }
  return tier;
}

/**
 * Tier THẬT của 1 người chơi — dùng hàm này thay vì `tierForElo()` bất cứ
 * đâu cần hiển thị/tính thưởng theo tier của 1 user cụ thể (`tierForElo()`
 * vẫn được giữ làm phép tính ngưỡng thuần theo ELO, dùng cho phần hiển thị
 * bảng ngưỡng chung — xem `RANK_TIERS`). Đủ ELO Thách Đấu (`>= 2200`) mà
 * KHÔNG nằm trong top `CHALLENGER_TOP_N` thì hạ xuống Đại Cao Thủ — `rank`
 * là thứ hạng ELO toàn server (1-based), `null` nếu chưa biết (fail-safe:
 * coi như không đủ điều kiện Thách Đấu).
 */
export function computeTier(elo: number, rank: number | null): RankTier {
  const base = tierForElo(elo);
  const challenger = RANK_TIERS[RANK_TIERS.length - 1];
  if (
    base.name === challenger.name &&
    (rank === null || rank > CHALLENGER_TOP_N)
  ) {
    return RANK_TIERS[RANK_TIERS.length - 2]; // Đại Cao Thủ
  }
  return base;
}

/**
 * Thưởng xu cuối mùa theo tier — SỐ THAM KHẢO theo đúng đề xuất ban đầu
 * (Thách Đấu +10.000, Đại Cao Thủ +5.000), các bậc thấp hơn nội suy dần cho
 * cân bằng (không neo giá thật, xem FEATURES.md mục đánh giá rủi ro tài
 * chính) — CẦN chỉnh lại sau khi quan sát tốc độ kiếm/tiêu xu thật vài mùa.
 */
const SEASON_REWARD_BY_TIER: Record<string, number> = {
  Sắt: 0,
  Đồng: 200,
  Bạc: 500,
  Vàng: 1000,
  'Bạch Kim': 2000,
  'Kim Cương': 3500,
  'Cao Thủ': 5000,
  'Đại Cao Thủ': 5000,
  'Thách Đấu': 10000,
};

/** Top 1 toàn server (chỉ khi rank ở tier Thách Đấu) nhận thưởng riêng, thay
 * vì cộng thêm — số theo đúng đề xuất gốc (100.000 xu). */
const TOP1_CHALLENGER_REWARD = 100_000;

export function seasonReward(tier: RankTier, rank: number): number {
  if (tier.name === 'Thách Đấu' && rank === 1) return TOP1_CHALLENGER_REWARD;
  return SEASON_REWARD_BY_TIER[tier.name] ?? 0;
}

/**
 * Độ khó câu hỏi 1v1 tăng theo ELO trung bình của 2 người trong trận — bỏ
 * qua (`skip`) dần các từ THÔNG DỤNG NHẤT khi ELO cao hơn, giữ nguyên kích
 * thước cửa sổ từ vựng lấy mẫu (`POOL_SIZE` ở duel.service.ts) nên vẫn đủ
 * biến thiên câu hỏi mỗi trận, chỉ dịch chuyển sang từ HIẾM/KHÓ hơn. Số
 * THAM KHẢO, canh theo tổng ~10.9k từ HSK 3.0 — cần chỉnh lại nếu phân phối
 * ELO thật lệch nhiều so với ước lượng ban đầu.
 */
const DIFFICULTY_SKIP_BY_TIER: Record<string, number> = {
  Sắt: 0,
  Đồng: 0,
  Bạc: 200,
  Vàng: 600,
  'Bạch Kim': 1200,
  'Kim Cương': 2000,
  'Cao Thủ': 3000,
  'Đại Cao Thủ': 4200,
  'Thách Đấu': 5500,
};

export function wordPoolSkipForElo(elo: number): number {
  return DIFFICULTY_SKIP_BY_TIER[tierForElo(elo).name] ?? 0;
}

/** Soft reset ELO đầu mùa mới — kéo về gần mốc khởi điểm 1 nửa khoảng cách
 * thay vì reset cứng về 1000, để vẫn còn phản ánh phần nào trình độ mùa
 * trước (tránh cảm giác "mất trắng" gây nản, nhưng vẫn tạo cơ hội leo rank
 * lại mỗi mùa như game khác). */
export function softResetElo(elo: number): number {
  return Math.round(1000 + (elo - 1000) * 0.5);
}

/** Khoá mùa hiện tại dạng YYYYMM (UTC) — vừa unique vừa tự sắp đúng thứ tự. */
export function currentSeasonKey(date = new Date()): number {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}
