import { displayStreak, MAX_STREAK_FREEZE, nextStreak } from './streak.util';

const state = (current: number, freeze: number, lastIso: string | null) => ({
  current,
  freeze,
  lastIso,
});

describe('nextStreak — học hôm nay thì chuỗi đổi thế nào', () => {
  it('lần đầu học → chuỗi 1', () => {
    expect(nextStreak(state(0, 0, null), '2026-10-21')).toEqual({
      current: 1,
      freeze: 0,
      usedFreeze: false,
    });
  });

  it('học ngày liền sau → +1', () => {
    expect(nextStreak(state(4, 0, '2026-10-20'), '2026-10-21')?.current).toBe(
      5,
    );
  });

  it('hôm nay đã tính hoặc ngày lùi lại → không đổi', () => {
    expect(nextStreak(state(4, 0, '2026-10-21'), '2026-10-21')).toBeNull();
    expect(nextStreak(state(4, 0, '2026-10-22'), '2026-10-21')).toBeNull();
  });

  it('lỡ nghỉ đúng 1 ngày, còn lá chắn → tiêu 1 lá chắn và hôm nay vẫn +1', () => {
    expect(nextStreak(state(5, 1, '2026-10-19'), '2026-10-21')).toEqual({
      current: 6,
      freeze: 0,
      usedFreeze: true,
    });
  });

  it('lỡ nghỉ 1 ngày mà hết lá chắn, hoặc nghỉ 2 ngày → về 1', () => {
    expect(nextStreak(state(5, 0, '2026-10-19'), '2026-10-21')?.current).toBe(
      1,
    );
    expect(nextStreak(state(5, 2, '2026-10-18'), '2026-10-21')).toEqual({
      current: 1,
      freeze: 2,
      usedFreeze: false,
    });
  });

  it('chạm mốc 7 ngày → +1 lá chắn, không quá mức tối đa', () => {
    expect(nextStreak(state(6, 0, '2026-10-20'), '2026-10-21')?.freeze).toBe(1);
    expect(
      nextStreak(state(13, MAX_STREAK_FREEZE, '2026-10-20'), '2026-10-21')
        ?.freeze,
    ).toBe(MAX_STREAK_FREEZE);
  });
});

describe('displayStreak — chuỗi hiện cho người dùng trước khi học hôm nay', () => {
  it('học hôm nay rồi / hôm qua → còn chuỗi', () => {
    expect(displayStreak(state(5, 0, '2026-10-21'), '2026-10-21')).toEqual({
      current: 5,
      activeToday: true,
      savedByFreeze: false,
    });
    expect(displayStreak(state(5, 0, '2026-10-20'), '2026-10-21').current).toBe(
      5,
    );
  });

  it('lỡ 1 ngày mà còn lá chắn → chuỗi vẫn còn, đánh dấu đang được lá chắn giữ', () => {
    expect(displayStreak(state(5, 1, '2026-10-19'), '2026-10-21')).toEqual({
      current: 5,
      activeToday: false,
      savedByFreeze: true,
    });
  });

  it('lỡ 1 ngày không có lá chắn, hoặc nghỉ lâu hơn → 0', () => {
    expect(displayStreak(state(5, 0, '2026-10-19'), '2026-10-21').current).toBe(
      0,
    );
    expect(displayStreak(state(5, 2, '2026-10-17'), '2026-10-21').current).toBe(
      0,
    );
  });
});
