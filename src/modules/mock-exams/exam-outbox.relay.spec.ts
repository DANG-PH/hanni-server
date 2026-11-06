import { ExamOutboxRelay } from './exam-outbox.relay';

// @nestjs/schedule là ES module, Jest ở chế độ CommonJS không nạp được. Spec chỉ cần gọi hàm, không cần lịch.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  Interval: () => () => undefined,
  CronExpression: { EVERY_HOUR: '0 0-23/1 * * *' },
}));

function setup(enabled: boolean, rows: { id: string; payload: object }[]) {
  const queries: string[] = [];
  const query = jest.fn((sql: string) => {
    queries.push(sql);
    return Promise.resolve(sql.includes('SELECT') ? rows : []);
  });
  const db = {
    query,
    transaction: (work: (tx: { query: typeof query }) => Promise<number>) =>
      work({ query }),
  };
  const streak = { recordActivity: jest.fn(() => Promise.resolve()) };
  const lease = { take: jest.fn(() => Promise.resolve(true)) };
  const relay = new ExamOutboxRelay(
    db as never,
    streak as never,
    lease as never,
    { get: () => enabled } as never,
  );
  return { relay, streak, queries, lease };
}

describe('ExamOutboxRelay', () => {
  const event = {
    id: 'e1',
    payload: { userId: 'u1', minutes: 3, at: '2026-11-06T00:00:00.000Z' },
  };

  it('tắt thì không đụng tới CSDL', async () => {
    const { relay, queries } = setup(false, [event]);
    await relay.drain();
    expect(queries).toHaveLength(0);
  });

  it('làm việc phụ rồi đánh dấu xong trong cùng giao dịch', async () => {
    const { relay, streak, queries } = setup(true, [event]);
    await relay.drain();
    expect(streak.recordActivity).toHaveBeenCalledWith(
      'u1',
      new Date(event.payload.at),
      { minutesStudied: 3 },
    );
    expect(queries[0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(queries[1]).toContain('UPDATE "OutboxEvent"');
  });

  it('không có việc thì không ghi gì', async () => {
    const { relay, queries } = setup(true, []);
    await relay.drain();
    expect(queries).toHaveLength(1);
  });

  it('dọn outbox chỉ 1 worker làm mỗi giờ', async () => {
    const { relay, lease } = setup(true, []);
    lease.take.mockResolvedValue(false);
    await relay.purge();
    expect(lease.take).toHaveBeenCalled();
  });
});
