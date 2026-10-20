import {
  currentWeekKey,
  MAX_TIER,
  planRollover,
  weekKeyEnd,
  weekKeyStart,
  zoneOf,
} from './league.util';

const group = (tier: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, tier }));
const pointsOf = (...values: number[]) =>
  new Map(values.map((v, i) => [`u${i}`, v]));

describe('khoá tuần', () => {
  it('tuần bắt đầu thứ Hai 00:00 UTC, tuần sau = khoá kế tiếp', () => {
    const key = currentWeekKey(new Date('2026-10-20T07:00:00Z')); // thứ Ba
    expect(weekKeyStart(key).toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(currentWeekKey(weekKeyEnd(key))).toBe(
      `W${Number(key.slice(1)) + 1}`,
    );
  });
});

describe('planRollover', () => {
  it('nhóm dưới 5 người: không ai thăng/giáng', () => {
    const plan = planRollover(group(2, 4), pointsOf(50, 40, 30, 0));
    expect([...plan.values()].every((p) => p.movement === 'stay')).toBe(true);
  });

  it('nhóm 6 người: người cao nhất lên, người thấp nhất xuống 1 bậc', () => {
    const plan = planRollover(group(2, 6), pointsOf(5, 60, 30, 20, 10, 0));
    expect(plan.get('u1')).toEqual({ tier: 3, movement: 'up' });
    expect(plan.get('u5')).toEqual({ tier: 1, movement: 'down' });
    expect(plan.get('u0')).toEqual({ tier: 2, movement: 'stay' });
  });

  it('bậc thấp nhất không giáng, bậc cao nhất không thăng', () => {
    const bottom = planRollover(group(0, 6), pointsOf(60, 50, 40, 30, 20, 0));
    expect(bottom.get('u5')).toEqual({ tier: 0, movement: 'stay' });
    const top = planRollover(
      group(MAX_TIER, 6),
      pointsOf(60, 50, 40, 30, 20, 0),
    );
    expect(top.get('u0')).toEqual({ tier: MAX_TIER, movement: 'stay' });
  });

  it('cả tuần không ôn thì không được thăng dù đứng đầu', () => {
    const plan = planRollover(group(0, 6), pointsOf(0, 0, 0, 0, 0, 0));
    expect([...plan.values()].every((p) => p.tier === 0)).toBe(true);
  });

  it('mỗi bậc xếp riêng', () => {
    const entries = [...group(0, 5), { userId: 'x', tier: 3 }];
    const plan = planRollover(entries, pointsOf(1, 2, 3, 4, 5));
    expect(plan.get('u4')).toEqual({ tier: 1, movement: 'up' });
    expect(plan.get('x')).toEqual({ tier: 3, movement: 'stay' });
  });
});

describe('zoneOf (vùng hiện trên bảng giải đấu)', () => {
  it('khớp luật chốt tuần', () => {
    expect(zoneOf(1, 6, 1, 10)).toBe('up');
    expect(zoneOf(1, 6, 1, 0)).toBe('stay');
    expect(zoneOf(6, 6, 1, 0)).toBe('down');
    expect(zoneOf(4, 4, 1, 0)).toBe('stay'); // nhóm < 5: người cuối vẫn an toàn
  });
});
