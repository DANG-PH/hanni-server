import type { Repository } from 'typeorm';
import type {
  MinigameSession,
  User,
  UserWordProgress,
  Word,
} from '../../database/entities';
import { GameMode } from '../../database/enums';
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
  const repos = {
    progress: { find: jest.fn() },
    words: { find: jest.fn(() => Promise.resolve(WORDS)) },
    sessions: { insert: jest.fn() },
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
    repos.sessions as unknown as Repository<MinigameSession>,
    repos.words as unknown as Repository<Word>,
    repos.progress as unknown as Repository<UserWordProgress>,
    {} as Repository<User>,
    wallet as unknown as WalletService,
    redis as unknown as RedisService,
  );
  return { service, repos, redis, wallet, store };
}

describe('MinigameService — khách chơi không cần tài khoản', () => {
  it('bắt đầu + nộp bài: chấm theo đáp án đã lưu, không xu, không ghi DB', async () => {
    const { service, repos, wallet, store } = setup();
    const started = await service.start(null, GameMode.TRANSLATE);
    expect(repos.progress.find).not.toHaveBeenCalled();
    expect(repos.sessions.insert).not.toHaveBeenCalled();
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
