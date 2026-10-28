/* eslint-disable @typescript-eslint/require-await -- Redis/repo giả trả Promise cho giống thật */
import { DailyQuotaService } from './daily-quota.service';

/** Redis giả trong bộ nhớ (chỉ incr/decr/get/expire) + user thường hoặc Premium. */
function setup(premiumUntil: Date | null = null) {
  const store = new Map<string, number>();
  const redis = {
    client: {
      incr: async (k: string) => {
        store.set(k, (store.get(k) ?? 0) + 1);
        return store.get(k)!;
      },
      decr: async (k: string) => {
        store.set(k, (store.get(k) ?? 0) - 1);
        return store.get(k)!;
      },
      get: async (k: string) => (store.has(k) ? String(store.get(k)) : null),
      expire: async () => 1,
    },
  };
  const users = {
    findOneOrFail: async () => ({
      id: 'u1',
      premiumUntil,
      timezone: 'Asia/Ho_Chi_Minh',
    }),
  };
  const config = { get: () => 3 };
  const quota = new DailyQuotaService(
    config as never,
    users as never,
    redis as never,
  );
  return { quota, store };
}

const RULE = { name: 'scan', free: 2, premium: 5 };

describe('DailyQuotaService', () => {
  it('bản thường: hết 2 lượt thì từ chối, không trừ thêm', async () => {
    const { quota } = setup();
    expect((await quota.take('u1', RULE)).ok).toBe(true);
    expect((await quota.take('u1', RULE)).ok).toBe(true);
    const third = await quota.take('u1', RULE);
    expect(third).toMatchObject({ ok: false, limit: 2, premium: false });
    expect((await quota.peek('u1', RULE)).used).toBe(2);
  });

  it('AI lỗi thì trả lại lượt', async () => {
    const { quota } = setup();
    await quota.take('u1', RULE);
    await quota.take('u1', RULE);
    await quota.refund('u1', RULE);
    expect((await quota.take('u1', RULE)).ok).toBe(true);
  });

  it('Premium còn hạn dùng mức Premium', async () => {
    const { quota } = setup(new Date(Date.now() + 86_400_000));
    const q = await quota.take('u1', RULE);
    expect(q).toMatchObject({ ok: true, limit: 5, premium: true });
  });

  it('mỗi tính năng 1 bộ đếm riêng theo ngày học', async () => {
    const { quota, store } = setup();
    await quota.take('u1', RULE);
    await quota.take('u1', { ...RULE, name: 'aitools' });
    const keys = [...store.keys()];
    expect(keys).toHaveLength(2);
    expect(
      keys.every((k) => /^(scan|aitools):u1:\d{4}-\d{2}-\d{2}$/.test(k)),
    ).toBe(true);
  });
});
