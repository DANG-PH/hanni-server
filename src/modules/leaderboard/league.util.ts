/**
 * Giải đấu học tập theo tuần — xếp theo mức độ HỌC TẬP (số lượt ôn SRS hoàn
 * thành trong tuần). Tên bậc dùng chủ đề đá quý (kiểu Duolingo).
 */

export interface LeagueTier {
  name: string;
  color: string;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { name: 'Đồng', color: '#b56a45' },
  { name: 'Bạc', color: '#9aa5b1' },
  { name: 'Vàng', color: '#d4af37' },
  { name: 'Bạch Kim', color: '#4fb0a5' },
  { name: 'Ngọc Lam', color: '#4a90d9' },
  { name: 'Hồng Ngọc', color: '#e0416f' },
  { name: 'Lục Bảo', color: '#2fa86a' },
  { name: 'Xà Cừ', color: '#c9c9d9' },
  { name: 'Kim Cương', color: '#7ecbe0' },
];

export const STARTING_TIER = 0;
export const MAX_TIER = LEAGUE_TIERS.length - 1;

/** Mỗi nhóm thăng tối đa 3, giáng tối đa 3 (hoặc ~20% nếu nhóm lớn hơn). */
export function promoteDemoteCount(groupSize: number): number {
  return Math.max(1, Math.min(3, Math.floor(groupSize * 0.2)));
}

/** Nhóm quá nhỏ (mới ra mắt, ít user) thì không giáng hạng ai — tránh giáng
 * oan chỉ vì tuần đó vô tình không đủ người hoạt động. */
export const MIN_GROUP_FOR_MOVEMENT = 5;

export type Movement = 'up' | 'down' | 'stay';

/** Vùng của 1 người trong nhóm-bậc khi tuần kết thúc (`rank` tính từ 1, nhóm đã xếp điểm giảm dần).
 * Thăng hạng phải có điểm — nhóm cả tuần không ai ôn thì không ai được lên. */
export function zoneOf(
  rank: number,
  groupSize: number,
  tier: number,
  points: number,
): Movement {
  const n =
    groupSize >= MIN_GROUP_FOR_MOVEMENT ? promoteDemoteCount(groupSize) : 0;
  if (tier < MAX_TIER && rank <= n && points > 0) return 'up';
  if (tier > STARTING_TIER && rank > groupSize - n) return 'down';
  return 'stay';
}

export interface RolloverResult {
  /** Bậc của tuần sau. */
  tier: number;
  movement: Movement;
  /** Hạng trong nhóm-bậc tuần vừa chốt (từ 1) và số người trong nhóm. */
  rank: number;
  groupSize: number;
}

/** Chốt tuần: mỗi nhóm-bậc xếp theo điểm rồi thăng/giáng 1 bậc theo `zoneOf`. */
export function planRollover(
  entries: { userId: string; tier: number }[],
  points: Map<string, number>,
): Map<string, RolloverResult> {
  const byTier = new Map<number, string[]>();
  for (const e of entries)
    byTier.set(e.tier, [...(byTier.get(e.tier) ?? []), e.userId]);

  const plan = new Map<string, RolloverResult>();
  for (const [tier, userIds] of byTier) {
    const ranked = [...userIds].sort(
      (a, b) => (points.get(b) ?? 0) - (points.get(a) ?? 0),
    );
    ranked.forEach((userId, i) => {
      const movement = zoneOf(
        i + 1,
        ranked.length,
        tier,
        points.get(userId) ?? 0,
      );
      const next =
        movement === 'up' ? tier + 1 : movement === 'down' ? tier - 1 : tier;
      plan.set(userId, {
        tier: next,
        movement,
        rank: i + 1,
        groupSize: ranked.length,
      });
    });
  }
  return plan;
}

const WEEK_MS = 7 * 86_400_000;
// Thứ Hai 1/1/2024 (UTC) — mốc cố định bất kỳ, chỉ cần đúng là thứ Hai thật.
const EPOCH_MONDAY_UTC = Date.UTC(2024, 0, 1);

/** Khoá tuần tự tăng "W123" — không dùng số tuần ISO lịch để khỏi xử lý các
 * trường hợp biên qua năm, chỉ cần tăng đều đặn mỗi 7 ngày. */
export function currentWeekKey(date: Date = new Date()): string {
  const n = Math.floor((date.getTime() - EPOCH_MONDAY_UTC) / WEEK_MS);
  return `W${n}`;
}

export function weekKeyStart(weekKey: string): Date {
  const n = Number(weekKey.slice(1));
  return new Date(EPOCH_MONDAY_UTC + n * WEEK_MS);
}

export function weekKeyEnd(weekKey: string): Date {
  return new Date(weekKeyStart(weekKey).getTime() + WEEK_MS);
}
