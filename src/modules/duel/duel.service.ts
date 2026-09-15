import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { tierForElo } from './duel-rank.util';

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
/** Khoảng nghỉ sau khi ghép trận xong, trước câu hỏi đầu tiên — cho UI hiện
 * màn hình "VS" (2 avatar + đếm ngược) thay vì nhảy thẳng vào câu hỏi. */
const MATCH_INTRO_MS = 3_000;
/** Thời gian chờ sau khi 1 người rớt mạng giữa trận trước khi xử thua luôn
 * (forfeit) — đủ để load lại trang/mạng chập chờn ngắn mà không huỷ trận
 * oan, nhưng không dài tới mức đối thủ phải chờ vô thời hạn. */
const DISCONNECT_FORFEIT_MS = 15_000;
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

export interface PlayerInfo {
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
  started: boolean;
  scores: Map<string, number>;
  roundAnswers: Map<string, number>;
  roundTimer: ReturnType<typeof setTimeout> | null;
  nextRoundTimer: ReturnType<typeof setTimeout> | null;
  /** timer chờ xử forfeit nếu người này đang rớt mạng, xem `handlePlayerDisconnect()` */
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
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

  getQueueSize(): number {
    return this.queue.length;
  }

  /** Trạng thái trận ĐANG DIỄN RA của user, nếu có — để FE tự phục hồi UI
   * khi mở lại trang/refresh giữa trận thay vì bị kẹt ở màn hình "Tìm đối
   * thủ" trong lúc trận vẫn tiếp diễn ở server (round timer không phụ thuộc
   * việc client có đang xem hay không). */
  getActiveMatchState(userId: string) {
    const matchId = this.playerToMatch.get(userId);
    if (!matchId) return null;
    const match = this.matches.get(matchId);
    if (!match) return null;
    const opponent = match.players.find((p) => p.id !== userId);
    if (!opponent) return null;
    const q = match.started ? match.questions[match.round] : null;
    return {
      matchId: match.id,
      opponent,
      totalRounds: ROUNDS_PER_MATCH,
      round: match.round,
      scores: Object.fromEntries(match.scores),
      question: q
        ? {
            wordId: q.wordId,
            prompt: q.prompt,
            pinyin: q.pinyin,
            options: q.options,
          }
        : null,
      myAnswered: match.roundAnswers.has(userId),
    };
  }

  /** Rớt mạng giữa hàng đợi thì rời hàng đợi luôn (không ai muốn ghép với
   * người sắp mất kết nối); rớt mạng GIỮA TRẬN thì cho `DISCONNECT_FORFEIT_MS`
   * để load lại/mạng chập chờn ngắn, không xử thua ngay lập tức. */
  handlePlayerDisconnect(userId: string): void {
    this.leaveQueue(userId);
    const matchId = this.playerToMatch.get(userId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;

    const existing = match.disconnectTimers.get(userId);
    if (existing) clearTimeout(existing);
    match.disconnectTimers.set(
      userId,
      setTimeout(
        () => void this.forfeitMatch(matchId, userId),
        DISCONNECT_FORFEIT_MS,
      ),
    );
  }

  /** Huỷ timer forfeit nếu người này kết nối lại kịp trong lúc trận vẫn còn
   * đang diễn ra. */
  handlePlayerReconnect(userId: string): void {
    const matchId = this.playerToMatch.get(userId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;
    const timer = match.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      match.disconnectTimers.delete(userId);
    }
  }

  private async forfeitMatch(
    matchId: string,
    forfeitedBy: string,
  ): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return; // trận đã kết thúc bình thường trước khi hết hạn chờ
    if (match.roundTimer) clearTimeout(match.roundTimer);
    if (match.nextRoundTimer) clearTimeout(match.nextRoundTimer);
    await this.finishMatch(matchId, forfeitedBy);
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
      started: false,
      scores: new Map([
        [a.id, 0],
        [b.id, 0],
      ]),
      roundAnswers: new Map(),
      roundTimer: null,
      nextRoundTimer: null,
      disconnectTimers: new Map(),
    };
    this.matches.set(match.id, match);
    this.playerToMatch.set(a.id, match.id);
    this.playerToMatch.set(b.id, match.id);

    this.gateway.emitToUser(a.id, 'duel:matched', {
      matchId: match.id,
      opponent: b,
      totalRounds: ROUNDS_PER_MATCH,
      introMs: MATCH_INTRO_MS,
    });
    this.gateway.emitToUser(b.id, 'duel:matched', {
      matchId: match.id,
      opponent: a,
      totalRounds: ROUNDS_PER_MATCH,
      introMs: MATCH_INTRO_MS,
    });

    // Chờ 1 nhịp cho UI hiện màn "VS" trước khi bắn câu hỏi đầu tiên, thay
    // vì nhảy thẳng vào chơi ngay lúc vừa ghép xong.
    match.nextRoundTimer = setTimeout(() => {
      match.started = true;
      this.startRound(match);
    }, MATCH_INTRO_MS);
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

  private async finishMatch(
    matchId: string,
    forfeitedBy?: string,
  ): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;
    const [a, b] = match.players;
    const scoreA = match.scores.get(a.id) ?? 0;
    const scoreB = match.scores.get(b.id) ?? 0;
    // Forfeit (rớt mạng quá lâu giữa trận) luôn xử người đó thua, bất kể
    // điểm số hiện tại đang dẫn hay không.
    const winnerId = forfeitedBy
      ? forfeitedBy === a.id
        ? b.id
        : a.id
      : scoreA === scoreB
        ? null
        : scoreA > scoreB
          ? a.id
          : b.id;
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
          forfeitedUserId: forfeitedBy ?? null,
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
      // "me" | "opponent" | null — ai là người rớt mạng gây kết thúc sớm,
      // để FE hiện đúng thông báo ("bạn bị xử thua" khác "đối thủ rớt mạng").
      forfeitedBy:
        forfeitedBy === undefined
          ? null
          : forfeitedBy === me.id
            ? 'me'
            : 'opponent',
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

    for (const timer of match.disconnectTimers.values()) clearTimeout(timer);
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
    const tier = tierForElo(rating.elo);
    return {
      elo: rating.elo,
      wins: rating.wins,
      losses: rating.losses,
      draws: rating.draws,
      tier: tier.name,
      tierColor: tier.color,
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
      tier: tierForElo(r.elo).name,
      tierColor: tierForElo(r.elo).color,
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
