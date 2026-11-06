import { RedisThrottlerStorage } from './redis-throttler.storage';

describe('RedisThrottlerStorage', () => {
  const storage = (hits: number, pttl: number) => {
    const redis = { eval: jest.fn().mockResolvedValue([hits, pttl]) };
    return { redis, store: new RedisThrottlerStorage(redis) };
  };

  it('chưa vượt hạn mức thì không chặn', async () => {
    const { store } = storage(3, 40_000);
    await expect(
      store.increment('ip:1', 60_000, 5, 0, 'default'),
    ).resolves.toEqual({
      totalHits: 3,
      timeToExpire: 40,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('vượt hạn mức thì chặn tới khi khoá hết hạn', async () => {
    const { store } = storage(6, 12_500);
    const record = await store.increment('ip:1', 60_000, 5, 0, 'default');
    expect(record.isBlocked).toBe(true);
    expect(record.timeToBlockExpire).toBe(13);
  });

  it('đúng khoá và thời hạn truyền cho Redis', async () => {
    const { redis, store } = storage(1, 60_000);
    await store.increment('user:42', 60_000, 5, 0, 'default');
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'throttle:default:user:42',
      60_000,
    );
  });

  it('Redis lỗi thì cho qua, không biến thành lỗi 500', async () => {
    const storage = new RedisThrottlerStorage({
      eval: () => Promise.reject(new Error('mất kết nối')),
    });
    const res = await storage.increment('k', 60_000, 1, 0, 'default');
    expect(res.isBlocked).toBe(false);
  });

  it('Redis treo thì không giữ request lại', async () => {
    const storage = new RedisThrottlerStorage({
      eval: () => new Promise(() => undefined),
    });
    const res = await storage.increment('k', 60_000, 1, 0, 'default');
    expect(res.isBlocked).toBe(false);
  });
});
