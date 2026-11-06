import { CronLeaseService } from './cron-lease.service';

function lease(enabled: boolean, set: (key: string) => Promise<string | null>) {
  return new CronLeaseService(
    { client: { set } } as never,
    { get: () => enabled } as never,
  );
}

function memoryRedis() {
  const keys = new Set<string>();
  return (key: string) => {
    if (keys.has(key)) return Promise.resolve(null);
    keys.add(key);
    return Promise.resolve('OK');
  };
}

describe('CronLeaseService', () => {
  const hour = 3_600_000;
  const t = 500_000 * hour;

  it('tắt thì luôn chạy, giữ nguyên hành vi 1 tiến trình', async () => {
    const set = jest.fn();
    await expect(lease(false, set).take('job', hour, t)).resolves.toBe(true);
    expect(set).not.toHaveBeenCalled();
  });

  it('2 bản cùng chu kỳ chỉ 1 bản chạy, chu kỳ sau lại có lượt', async () => {
    const service = lease(true, memoryRedis());
    await expect(service.take('job', hour, t)).resolves.toBe(true);
    await expect(service.take('job', hour, t)).resolves.toBe(false);
    await expect(service.take('job', hour, t + hour)).resolves.toBe(true);
  });

  it('2 máy lệch đồng hồ quanh mốc cron vẫn tính là 1 chu kỳ', async () => {
    const service = lease(true, memoryRedis());
    await expect(service.take('job', hour, t - 2_000)).resolves.toBe(true);
    await expect(service.take('job', hour, t + 2_000)).resolves.toBe(false);
  });

  it('Redis lỗi thì bỏ lượt, không chạy liều', async () => {
    const service = lease(true, () => Promise.reject(new Error('mất kết nối')));
    await expect(service.take('job', hour, t)).resolves.toBe(false);
  });
});
