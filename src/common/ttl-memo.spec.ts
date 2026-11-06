import { TtlMemo } from './ttl-memo';

describe('TtlMemo', () => {
  const t = 1_000_000;

  it('nhiều lượt gọi cùng lúc chỉ tải 1 lần', async () => {
    const memo = new TtlMemo<number>(60_000);
    const load = jest.fn(() => Promise.resolve(1));
    await Promise.all([memo.get('k', load, t), memo.get('k', load, t)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('hết hạn thì tải lại, khác khoá thì tải riêng', async () => {
    const memo = new TtlMemo<number>(60_000);
    const load = jest.fn(() => Promise.resolve(1));
    await memo.get('k', load, t);
    await memo.get('k', load, t + 60_000);
    await memo.get('khac', load, t + 60_000);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('lỗi không nằm lại trong cache', async () => {
    const memo = new TtlMemo<number>(60_000);
    await expect(
      memo.get('k', () => Promise.reject(new Error('mất CSDL')), t),
    ).rejects.toThrow();
    await expect(memo.get('k', () => Promise.resolve(2), t)).resolves.toBe(2);
  });
});
