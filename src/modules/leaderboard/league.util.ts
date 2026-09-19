/**
 * Giải đấu học tập theo tuần — xếp theo mức độ HỌC TẬP (số lượt ôn SRS hoàn
 * thành trong tuần), khác hẳn ELO đấu 1v1. Tên bậc dùng chủ đề đá quý (kiểu
 * Duolingo) — CỐ Ý khác tên bậc "Sắt→Thách Đấu" của đấu 1v1 (`duel-rank.util.ts`)
 * để không gây nhầm lẫn 2 hệ xếp hạng khác nhau.
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
