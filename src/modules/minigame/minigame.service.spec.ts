import { GameMode } from '@prisma/client';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { RedisService } from '../../infra/redis/redis.service';
import type { WalletService } from '../wallet/wallet.service';
import { MinigameService } from './minigame.service';

const WORDS = Array.from({ length: 12 }, (_, i) => ({
  id: `w${i}`,
  simplified: `字${i}`,
  pinyin: `zi${i}`,
  meaningVi: `nghĩa ${i}`,
  audioUrl: null,
}));

function setup() {
  const store = new Map<string, unknown>();
  const prisma = {
    userWordProgress: { findMany: jest.fn() },
    word: { findMany: jest.fn(() => Promise.resolve(WORDS)) },
    minigameSession: { create: jest.fn() },
  };
  const redis = {
    setJson: jest.fn((key: string, value: unknown) => {
      store.set(key, JSON.parse(JSON.stringify(value)));
      return Promise.resolve();
    }),
    takeJson: jest.fn((key: string) => {
      const v = store.get(key) ?? null;
      store.delete(key);
      return Promise.resolve(v);
    }),
  };
  const wallet = { credit: jest.fn() };
  const service = new MinigameService(
    prisma as unknown as PrismaService,
    wallet as unknown as WalletService,
    redis as unknown as RedisService,
  );
  return { service, prisma, redis, wallet, store };
}

describe('MinigameService — khách chơi không cần tài khoản', () => {
  it('bắt đầu + nộp bài: chấm theo đáp án đã lưu, không xu, không ghi DB', async () => {
    const { service, prisma, wallet, store } = setup();
    const started = await service.start(null, GameMode.TRANSLATE);
    expect(prisma.userWordProgress.findMany).not.toHaveBeenCalled();
    expect(prisma.minigameSession.create).not.toHaveBeenCalled();
    expect(store.size).toBe(1);
    if (!('questions' in started)) throw new Error('phải là trắc nghiệm');
    // Không lộ đáp án ra client.
    expect(started.questions[0]).not.toHaveProperty('correctIndex');

    const stored = [...store.values()][0] as {
      questions: { wordId: string; correctIndex: number }[];
    };
    const [q0, q1] = stored.questions;
    const result = await service.finish(null, started.sessionId, {
      durationMs: 30_000,
      answers: [
        { wordId: q0.wordId, chosenIndex: q0.correctIndex },
        { wordId: q1.wordId, chosenIndex: (q1.correctIndex + 1) % 4 },
      ],
    });
    expect(result).toEqual({
      score: 1,
      totalAsked: 2,
      coinsEarned: 0,
      balance: null,
    });
    expect(wallet.credit).not.toHaveBeenCalled();

    // Lượt chơi chỉ nộp được 1 lần.
    await expect(
      service.finish(null, started.sessionId, { durationMs: 1, answers: [] }),
    ).rejects.toThrow('Không tìm thấy lượt chơi');
  });

  it('ghép cặp: điểm = số cặp trừ số lần lật sai', async () => {
    const { service } = setup();
    const started = await service.start(null, GameMode.MATCH);
    const result = await service.finish(null, started.sessionId, {
      durationMs: 20_000,
      mistakes: 3,
    });
    expect(result).toMatchObject({ score: 5, coinsEarned: 0, balance: null });
  });
});
