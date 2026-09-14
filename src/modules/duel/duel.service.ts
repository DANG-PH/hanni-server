import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUNDS_PER_MATCH = 8;
const ROUND_DURATION_MS = 8_000;
const RESULT_DISPLAY_MS = 2_500;
const POOL_SIZE = 800;
const ELO_K = 32;
const STARTING_ELO = 1000;

interface DuelQuestion {
  wordId: string;
  prompt: string;
  pinyin: string;
  options: string[];
  correctIndex: number;
}

interface PlayerInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface QueuedPlayer extends PlayerInfo {
  queuedAt: number;
}

interface ActiveMatch {
  id: string;
  players: [PlayerInfo, PlayerInfo];
  questions: DuelQuestion[];
  round: number;
  scores: Map<string, number>;
  roundAnswers: Map<string, number>;
  roundTimer: ReturnType<typeof setTimeout> | null;
  nextRoundTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * "Đấu 1v1" — Giai đoạn 2 minigame (xem FEATURES.md). Server giữ TOÀN BỘ
 * trạng thái trận đấu trong bộ nhớ (`matches`/`queue`) — CHỈ đúng khi chạy
 * 1 instance; nếu sau này scale nhiều instance (đã có RedisIoAdapter cho
 * WebSocket nhưng CHƯA dùng cho hàng đợi/trạng thái trận này) cần chuyển
 * hàng đợi + `ActiveMatch` sang Redis để 2 người ở 2 instance khác nhau vẫn
 * ghép được với nhau. Chấp nhận được ở giai đoạn kiểm chứng gameplay này vì
 * production hiện chỉ chạy 1 instance.
 *
 * Luật 1 trận: `ROUNDS_PER_MATCH` câu, mỗi câu có `ROUND_DURATION_MS` để cả
 * 2 trả lời — ai đúng thì được 1 điểm (cả 2 đúng thì cả 2 đều được, không
 * cộng thêm vì nhanh hơn — đơn giản hoá cho giai đoạn kiểm chứng, chưa cần
 * đo tốc độ chính xác tới ms). Vòng kết thúc SỚM nếu cả 2 đã trả lời, không
 * cần chờ hết giờ. Hết `ROUNDS_PER_MATCH` câu thì chấm ELO theo công thức
 * chuẩn (K=32, giống hệ Elo cờ vua phổ biến).
 */
@Injectable()
export class DuelService {
  private readonly logger = new Logger(DuelService.name);
  private queue: QueuedPlayer[] = [];
  private matches = new Map<string, ActiveMatch>();
  private playerToMatch = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  async joinQueue(userId: string): Promise<void> {
    if (this.playerToMatch.has(userId)) return; // đang đấu rồi
    if (this.queue.some((p) => p.id === userId)) return; // đã trong hàng đợi

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    if (!user) return;

    this.queue.push({ ...user, queuedAt: Date.now() });
    this.tryMatch();
  }

  leaveQueue(userId: string): void {
    this.queue = this.queue.filter((p) => p.id !== userId);
  }

  private tryMatch(): void {
    if (this.queue.length < 2) return;
    const [a, b] = this.queue.splice(0, 2);
    void this.startMatch(a, b);
  }

  private async startMatch(a: PlayerInfo, b: PlayerInfo): Promise<void> {
    const questions = await this.generateQuestions();
    if (questions.length < ROUNDS_PER_MATCH) {
      this.logger.warn('Không đủ từ vựng để tạo trận đấu');
      return;
    }

    const match: ActiveMatch = {
      id: crypto.randomUUID(),
      players: [a, b],
      questions,
      round: 0,
      scores: new Map([
        [a.id, 0],
        [b.id, 0],
      ]),
      roundAnswers: new Map(),
      roundTimer: null,
      nextRoundTimer: null,
    };
    this.matches.set(match.id, match);
    this.playerToMatch.set(a.id, match.id);
    this.playerToMatch.set(b.id, match.id);

    this.gateway.emitToUser(a.id, 'duel:matched', {
      matchId: match.id,
      opponent: b,
      totalRounds: ROUNDS_PER_MATCH,
    });
    this.gateway.emitToUser(b.id, 'duel:matched', {
      matchId: match.id,
      opponent: a,
      totalRounds: ROUNDS_PER_MATCH,
    });

    this.startRound(match);
  }

  private startRound(match: ActiveMatch): void {
    match.roundAnswers.clear();
    const q = match.questions[match.round];
    const payload = {
      matchId: match.id,
      round: match.round,
      totalRounds: ROUNDS_PER_MATCH,
      question: {
        wordId: q.wordId,
        prompt: q.prompt,
        pinyin: q.pinyin,
        options: q.options,
      },
      deadlineMs: ROUND_DURATION_MS,
    };
    for (const p of match.players) {
      this.gateway.emitToUser(p.id, 'duel:round', payload);
    }
    match.roundTimer = setTimeout(
      () => this.resolveRound(match.id),
      ROUND_DURATION_MS,
    );
  }

  submitAnswer(userId: string, matchId: string, chosenIndex: number): void {
    const match = this.matches.get(matchId);
    if (!match) return;
    if (!match.players.some((p) => p.id === userId)) return;
    if (match.roundAnswers.has(userId)) return; // đã trả lời câu này rồi

    match.roundAnswers.set(userId, chosenIndex);
    if (match.roundAnswers.size >= match.players.length) {
      if (match.roundTimer) clearTimeout(match.roundTimer);
      this.resolveRound(matchId);
    }
  }

  private resolveRound(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match) return;
    if (match.roundTimer) {
      clearTimeout(match.roundTimer);
      match.roundTimer = null;
    }

    const q = match.questions[match.round];
    for (const p of match.players) {
      if (match.roundAnswers.get(p.id) === q.correctIndex) {
        match.scores.set(p.id, (match.scores.get(p.id) ?? 0) + 1);
      }
    }

    const scoresPayload = Object.fromEntries(match.scores);
    for (const p of match.players) {
      this.gateway.emitToUser(p.id, 'duel:round-result', {
        matchId: match.id,
        round: match.round,
        correctIndex: q.correctIndex,
        scores: scoresPayload,
      });
    }

    match.round += 1;
    if (match.round >= ROUNDS_PER_MATCH) {
      match.nextRoundTimer = setTimeout(
        () => void this.finishMatch(matchId),
        RESULT_DISPLAY_MS,
      );
    } else {
      match.nextRoundTimer = setTimeout(
        () => this.startRound(match),
        RESULT_DISPLAY_MS,
      );
    }
  }

  private async finishMatch(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;
    const [a, b] = match.players;
    const scoreA = match.scores.get(a.id) ?? 0;
    const scoreB = match.scores.get(b.id) ?? 0;
    const winnerId = scoreA === scoreB ? null : scoreA > scoreB ? a.id : b.id;
    const resultA = winnerId === null ? 0.5 : winnerId === a.id ? 1 : 0;
    const resultB = 1 - resultA;

    const [ratingA, ratingB] = await Promise.all([
      this.getOrCreateRating(a.id),
      this.getOrCreateRating(b.id),
    ]);

    const expectedA = 1 / (1 + 10 ** ((ratingB.elo - ratingA.elo) / 400));
    const changeA = Math.round(ELO_K * (resultA - expectedA));
    const changeB = -changeA;

    await Promise.all([
      this.prisma.userRating.update({
        where: { userId: a.id },
        data: {
          elo: ratingA.elo + changeA,
          wins: { increment: resultA === 1 ? 1 : 0 },
          losses: { increment: resultA === 0 ? 1 : 0 },
          draws: { increment: resultA === 0.5 ? 1 : 0 },
        },
      }),
      this.prisma.userRating.update({
        where: { userId: b.id },
        data: {
          elo: ratingB.elo + changeB,
          wins: { increment: resultB === 1 ? 1 : 0 },
          losses: { increment: resultB === 0 ? 1 : 0 },
          draws: { increment: resultB === 0.5 ? 1 : 0 },
        },
      }),
      this.prisma.duelMatch.create({
        data: {
          playerAId: a.id,
          playerBId: b.id,
          scoreA,
          scoreB,
          winnerId,
          eloChangeA: changeA,
          eloChangeB: changeB,
        },
      }),
    ]);

    const resultFor = (
      me: PlayerInfo,
      opponent: PlayerInfo,
      myScore: number,
      opponentScore: number,
      myChange: number,
      myNewElo: number,
    ) => ({
      matchId,
      opponent,
      myScore,
      opponentScore,
      winnerId,
      eloChange: myChange,
      newElo: myNewElo,
    });

    this.gateway.emitToUser(
      a.id,
      'duel:finished',
      resultFor(a, b, scoreA, scoreB, changeA, ratingA.elo + changeA),
    );
    this.gateway.emitToUser(
      b.id,
      'duel:finished',
      resultFor(b, a, scoreB, scoreA, changeB, ratingB.elo + changeB),
    );

    this.matches.delete(matchId);
    this.playerToMatch.delete(a.id);
    this.playerToMatch.delete(b.id);
  }

  private async getOrCreateRating(userId: string) {
    return this.prisma.userRating.upsert({
      where: { userId },
      create: { userId, elo: STARTING_ELO },
      update: {},
    });
  }

  async getMyRating(userId: string) {
    const rating = await this.getOrCreateRating(userId);
    return {
      elo: rating.elo,
      wins: rating.wins,
      losses: rating.losses,
      draws: rating.draws,
    };
  }

  async getLeaderboard() {
    const rows = await this.prisma.userRating.findMany({
      orderBy: { elo: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user.id,
      displayName: r.user.displayName,
      avatarUrl: r.user.avatarUrl,
      elo: r.elo,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
    }));
  }

  private async generateQuestions(): Promise<DuelQuestion[]> {
    const pool = await this.prisma.word.findMany({
      where: { meaningVi: { not: null } },
      orderBy: { frequencyRank: 'asc' },
      take: POOL_SIZE,
    });
    if (pool.length < 4) return [];

    const picked = shuffle(pool).slice(
      0,
      Math.min(ROUNDS_PER_MATCH, pool.length),
    );
    const allMeanings = pool.map((w) => w.meaningVi!).filter(Boolean);

    return picked.map((w) => {
      const distractors = shuffle(
        allMeanings.filter((m) => m !== w.meaningVi),
      ).slice(0, 3);
      const options = shuffle([w.meaningVi!, ...distractors]);
      return {
        wordId: w.id,
        prompt: w.simplified,
        pinyin: w.pinyin,
        options,
        correctIndex: options.indexOf(w.meaningVi!),
      };
    });
  }
}
