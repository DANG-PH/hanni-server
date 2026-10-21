import { diffCalendarDays } from '../../../common/time.util';

/** Cứ đủ 7 ngày liên tục lại được thưởng 1 "lá chắn" — lá chắn giữ chuỗi khi lỡ nghỉ đúng 1 ngày. */
export const FREEZE_MILESTONE_DAYS = 7;
/** Giữ tối đa 2 lá chắn cùng lúc (mốc 7 ngày, mời bạn, xong nhiệm vụ ngày đều cộng vào đây). */
export const MAX_STREAK_FREEZE = 2;

export interface StreakState {
  current: number;
  freeze: number;
  /** Ngày học gần nhất ("yyyy-MM-dd", theo ngày học của người dùng) — null nếu chưa học bao giờ. */
  lastIso: string | null;
}

export interface StreakStep {
  current: number;
  freeze: number;
  /** Vừa tiêu 1 lá chắn để giữ chuỗi qua ngày lỡ nghỉ. */
  usedFreeze: boolean;
}

/**
 * Người dùng học vào ngày `todayIso` thì chuỗi đổi thế nào — luật chuỗi ngày học, viết thuần để dễ đọc và test.
 * - Học tiếp ngày liền sau → +1.
 * - Lỡ nghỉ ĐÚNG 1 ngày mà còn lá chắn → tiêu 1 lá chắn, ngày nghỉ được bỏ qua và hôm nay vẫn +1 (như Duolingo).
 * - Nghỉ lâu hơn (hoặc hết lá chắn) → chuỗi về 1.
 * - Mỗi khi chuỗi chạm bội số 7 → thưởng 1 lá chắn (không quá MAX_STREAK_FREEZE).
 * Trả null khi không đổi gì: hôm nay đã tính rồi, hoặc ngày lùi lại (lệch đồng hồ / đổi múi giờ).
 */
export function nextStreak(
  state: StreakState,
  todayIso: string,
): StreakStep | null {
  let { current, freeze } = state;
  let usedFreeze = false;

  if (!state.lastIso) {
    current = 1;
  } else {
    const gap = diffCalendarDays(state.lastIso, todayIso);
    if (gap <= 0) return null;
    if (gap === 1) {
      current += 1;
    } else if (gap === 2 && freeze > 0) {
      freeze -= 1;
      usedFreeze = true;
      current += 1;
    } else {
      current = 1;
    }
  }

  if (current % FREEZE_MILESTONE_DAYS === 0 && freeze < MAX_STREAK_FREEZE)
    freeze += 1;

  return { current, freeze, usedFreeze };
}

/**
 * Chuỗi hiện ra cho người dùng hôm nay (trước khi họ học): đã lỡ quá 1 ngày, hoặc lỡ 1 ngày mà không còn lá chắn,
 * thì chuỗi đã đứt → 0. Lỡ đúng 1 ngày mà còn lá chắn thì chuỗi VẪN CÒN — học hôm nay là được giữ.
 */
export function displayStreak(
  state: StreakState,
  todayIso: string,
): { current: number; activeToday: boolean; savedByFreeze: boolean } {
  if (!state.lastIso)
    return { current: 0, activeToday: false, savedByFreeze: false };
  const gap = diffCalendarDays(state.lastIso, todayIso);
  if (gap <= 0)
    return { current: state.current, activeToday: true, savedByFreeze: false };
  if (gap === 1)
    return { current: state.current, activeToday: false, savedByFreeze: false };
  if (gap === 2 && state.freeze > 0)
    return { current: state.current, activeToday: false, savedByFreeze: true };
  return { current: 0, activeToday: false, savedByFreeze: false };
}
