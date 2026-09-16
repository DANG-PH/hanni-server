import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import type { PlayerInfo } from './duel.service';
import { wordPoolSkipForElo } from './duel-rank.util';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TEAM_SIZE = 2;
const PLAYERS_PER_MATCH = TEAM_SIZE * 2;
const ROUNDS_PER_MATCH = 8;
const ROUND_DURATION_MS = 8_000;
const RESULT_DISPLAY_MS = 2_500;
const MATCH_INTRO_MS = 3_000;
const DISCONNECT_FORFEIT_MS = 15_000;
const POOL_SIZE = 800;
const ELO_K = 32;
const STARTING_ELO = 1000;

interface TeamDuelQuestion {
  wordId: string;
  prompt: string;
  pinyin: string;
  options: string[];
  correctIndex: number;
}

interface QueuedPlayer extends PlayerInfo {
  queuedAt: number;
}

interface ActiveTeamMatch {
  id: string;
  /** đúng 2 đội, mỗi đội đúng `TEAM_SIZE` người */
  teams: [PlayerInfo[], PlayerInfo[]];
  questions: TeamDuelQuestion[];
  round: number;
  started: boolean;
  scores: Map<string, number>;
  roundAnswers: Map<string, number>;
  roundTimer: ReturnType<typeof setTimeout> | null;
  nextRoundTimer: ReturnType<typeof setTimeout> | null;
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
}

/**
 * "Đấu đôi" 2v2 — Giai đoạn 4 minigame (xem FEATURES.md). Dùng CHUNG
 * `UserRating`/rank tier/mùa giải với đấu 1v1 (`DuelService`) thay vì dựng
 * 1 bảng xếp hạng riêng cho 2v2 — đơn giản hơn nhiều và vẫn hợp lý vì cả 2
 * đều đo cùng 1 kỹ năng (phản xạ dịch từ vựng). KHÔNG lưu lịch sử trận đấu
 * riêng (khác `DuelMatch` của 1v1) — bảng đó chưa từng được hiển thị ở đâu
 * trên UI, thêm 1 bảng y hệt cho 4 người chơi (cần 4 cột khoá ngoại) chỉ
 * tăng độ phức tạp schema mà chưa ai cần tra lại lịch sử trận, nên bỏ qua
 * cho tới khi thực sự cần.
 *
 * Ghép đội: người chơi vào hàng đợi RIÊNG (`queue`, tách khỏi hàng đợi 1v1
 * của `DuelService`) — CHƯA hỗ trợ rủ bạn vào cùng 1 đội trước (chỉ ghép
 * ngẫu nhiên theo ELO), để dành cho bản sau nếu cần. Đủ 4 người thì ghép
 * theo kiểu "rắn" (snake seed) — sắp theo ELO giảm dần rồi ghép hạng 1+4
 * vào 1 đội, hạng 2+3 vào đội kia — để chênh lệch ELO trung bình 2 đội nhỏ
 * nhất có thể, giống cách nhiều game xếp đội cân bằng vẫn làm.
 *
 * Luật 1 trận: y hệt đấu 1v1 (8 câu, mỗi câu 8s, ai đúng được 1 điểm) —
 * điểm ĐỘI = tổng điểm 2 thành viên. Kết thúc trận: đội thắng/thua/hoà xử
 * ELO theo ELO TRUNG BÌNH của đội (công thức Elo chuẩn) rồi áp CÙNG 1 mức
 * thay đổi cho cả 2 thành viên — không chia theo đóng góp riêng từng người
 * (đơn giản hoá, tương tự cách nhiều game cờ đồng đội tính điểm đội).
 *
 * Rớt mạng: xử THUA CẢ ĐỘI nếu 1 người rớt mạng quá `DISCONNECT_FORFEIT_MS`
 * mà không quay lại kịp — đơn giản hoá chấp nhận được vì 2v2 mà thiếu người
 * gần như chắc chắn thua, không đáng xây cơ chế "chơi tiếp 2v1".
 */
@Injectable()
export class TeamDuelService {
  private readonly logger = new Logger(TeamDuelService.name);
  private queue: QueuedPlayer[] = [];
  private matches = new Map<string, ActiveTeamMatch>();
  private playerToMatch = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  async joinQueue(userId: string): Promise<void> {
    if (this.playerToMatch.has(userId)) return;
    if (this.queue.some((p) => p.id === userId)) return;

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

  /** Giống `DuelService.getActiveMatchState()` — FE tự phục hồi UI nếu
   * refresh giữa 1 trận 2v2 đang đấu. */
  getActiveMatchState(userId: string) {
    const matchId = this.playerToMatch.get(userId);
    if (!matchId) return null;
    const match = this.matches.get(matchId);
    if (!match) return null;

    const myTeamIndex = this.teamIndexOf(match, userId);
    if (myTeamIndex === null) return null;
    const opponentTeamIndex = myTeamIndex === 0 ? 1 : 0;
    const myTeam = match.teams[myTeamIndex];
    const opponentTeam = match.teams[opponentTeamIndex];
    const q = match.started ? match.questions[match.round] : null;

    return {
      matchId: match.id,
      myTeammates: myTeam.filter((p) => p.id !== userId),
      opponentTeam,
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

  private teamIndexOf(match: ActiveTeamMatch, userId: string): 0 | 1 | null {
    if (match.teams[0].some((p) => p.id === userId)) return 0;
    if (match.teams[1].some((p) => p.id === userId)) return 1;
    return null;
  }

  private async forfeitMatch(
    matchId: string,
    forfeitedBy: string,
  ): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;
    if (match.roundTimer) clearTimeout(match.roundTimer);
    if (match.nextRoundTimer) clearTimeout(match.nextRoundTimer);
    await this.finishMatch(matchId, forfeitedBy);
  }

  private tryMatch(): void {
    if (this.queue.length < PLAYERS_PER_MATCH) return;
    const four = this.queue.splice(0, PLAYERS_PER_MATCH);
    void this.startTeamMatch(four);
  }

  private async startTeamMatch(players: PlayerInfo[]): Promise<void> {
    const ratings = await Promise.all(
      players.map((p) => this.getOrCreateRating(p.id)),
    );
    const bySkill = players
      .map((p, i) => ({ player: p, elo: ratings[i].elo }))
      .sort((x, y) => y.elo - x.elo);
    // Ghép "rắn": hạng 1+4 vào 1 đội, hạng 2+3 vào đội kia — cân bằng ELO
    // trung bình 2 đội tốt hơn ghép ngẫu nhiên hoặc ghép liền kề.
    const teamA: PlayerInfo[] = [bySkill[0].player, bySkill[3].player];
    const teamB: PlayerInfo[] = [bySkill[1].player, bySkill[2].player];
    const avgElo = Math.round(
      ratings.reduce((sum, r) => sum + r.elo, 0) / ratings.length,
    );

    const questions = await this.generateQuestions(avgElo);
    if (questions.length < ROUNDS_PER_MATCH) {
      this.logger.warn('Không đủ từ vựng để tạo trận đấu đôi');
      return;
    }

    const match: ActiveTeamMatch = {
      id: crypto.randomUUID(),
      teams: [teamA, teamB],
      questions,
      round: 0,
      started: false,
      scores: new Map(players.map((p) => [p.id, 0])),
      roundAnswers: new Map(),
      roundTimer: null,
      nextRoundTimer: null,
      disconnectTimers: new Map(),
    };
    this.matches.set(match.id, match);
    for (const p of players) this.playerToMatch.set(p.id, match.id);

    for (const teamIndex of [0, 1] as const) {
      const myTeam = match.teams[teamIndex];
      const opponentTeam = match.teams[teamIndex === 0 ? 1 : 0];
      for (const me of myTeam) {
        this.gateway.emitToUser(me.id, 'teamduel:matched', {
          matchId: match.id,
          myTeammates: myTeam.filter((p) => p.id !== me.id),
          opponentTeam,
          totalRounds: ROUNDS_PER_MATCH,
          introMs: MATCH_INTRO_MS,
        });
      }
    }

    match.nextRoundTimer = setTimeout(() => {
      match.started = true;
      this.startRound(match);
    }, MATCH_INTRO_MS);
  }

  private allPlayers(match: ActiveTeamMatch): PlayerInfo[] {
    return [...match.teams[0], ...match.teams[1]];
  }

  private startRound(match: ActiveTeamMatch): void {
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
    for (const p of this.allPlayers(match)) {
      this.gateway.emitToUser(p.id, 'teamduel:round', payload);
    }
    match.roundTimer = setTimeout(
      () => this.resolveRound(match.id),
      ROUND_DURATION_MS,
    );
  }

  submitAnswer(userId: string, matchId: string, chosenIndex: number): void {
    const match = this.matches.get(matchId);
    if (!match) return;
    if (this.teamIndexOf(match, userId) === null) return;
    if (match.roundAnswers.has(userId)) return;

    match.roundAnswers.set(userId, chosenIndex);
    if (match.roundAnswers.size >= PLAYERS_PER_MATCH) {
      if (match.roundTimer) clearTimeout(match.roundTimer);
      this.resolveRound(matchId);
    }
  }

  private teamScore(match: ActiveTeamMatch, teamIndex: 0 | 1): number {
    return match.teams[teamIndex].reduce(
      (sum, p) => sum + (match.scores.get(p.id) ?? 0),
      0,
    );
  }

  private resolveRound(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match) return;
    if (match.roundTimer) {
      clearTimeout(match.roundTimer);
      match.roundTimer = null;
    }

    const q = match.questions[match.round];
    for (const p of this.allPlayers(match)) {
      if (match.roundAnswers.get(p.id) === q.correctIndex) {
        match.scores.set(p.id, (match.scores.get(p.id) ?? 0) + 1);
      }
    }

    const scoresPayload = Object.fromEntries(match.scores);
    const teamScores: [number, number] = [
      this.teamScore(match, 0),
      this.teamScore(match, 1),
    ];
    for (const p of this.allPlayers(match)) {
      this.gateway.emitToUser(p.id, 'teamduel:round-result', {
        matchId: match.id,
        round: match.round,
        correctIndex: q.correctIndex,
        scores: scoresPayload,
        teamScores,
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
    const players = this.allPlayers(match);
    const teamScores: [number, number] = [
      this.teamScore(match, 0),
      this.teamScore(match, 1),
    ];
    const forfeitedTeam =
      forfeitedBy !== undefined ? this.teamIndexOf(match, forfeitedBy) : null;
    const winnerTeam: 0 | 1 | null =
      forfeitedTeam !== null
        ? forfeitedTeam === 0
          ? 1
          : 0
        : teamScores[0] === teamScores[1]
          ? null
          : teamScores[0] > teamScores[1]
            ? 0
            : 1;
    const resultTeamA = winnerTeam === null ? 0.5 : winnerTeam === 0 ? 1 : 0;
    const resultTeamB = 1 - resultTeamA;

    const ratings = await Promise.all(
      players.map((p) => this.getOrCreateRating(p.id)),
    );
    const ratingOf = new Map(players.map((p, i) => [p.id, ratings[i]]));
    const avgEloOfTeam = (teamIndex: 0 | 1) => {
      const team = match.teams[teamIndex];
      return (
        team.reduce((sum, p) => sum + ratingOf.get(p.id)!.elo, 0) / team.length
      );
    };
    const avgEloA = avgEloOfTeam(0);
    const avgEloB = avgEloOfTeam(1);
    const expectedA = 1 / (1 + 10 ** ((avgEloB - avgEloA) / 400));
    const expectedB = 1 - expectedA;
    const changeA = Math.round(ELO_K * (resultTeamA - expectedA));
    const changeB = Math.round(ELO_K * (resultTeamB - expectedB));

    await Promise.all(
      players.map((p) => {
        const teamIndex = this.teamIndexOf(match, p.id)!;
        const change = teamIndex === 0 ? changeA : changeB;
        const result = teamIndex === 0 ? resultTeamA : resultTeamB;
        return this.prisma.userRating.update({
          where: { userId: p.id },
          data: {
            elo: ratingOf.get(p.id)!.elo + change,
            wins: { increment: result === 1 ? 1 : 0 },
            losses: { increment: result === 0 ? 1 : 0 },
            draws: { increment: result === 0.5 ? 1 : 0 },
          },
        });
      }),
    );

    for (const p of players) {
      const teamIndex = this.teamIndexOf(match, p.id)!;
      const opponentTeamIndex = teamIndex === 0 ? 1 : 0;
      const myTeammates = match.teams[teamIndex].filter((x) => x.id !== p.id);
      const change = teamIndex === 0 ? changeA : changeB;
      const rating = ratingOf.get(p.id)!;
      // "me" | "teammate" | "opponent" | null — ai gây kết thúc sớm, để FE
      // hiện đúng thông báo cho từng góc nhìn.
      const forfeitedByView =
        forfeitedBy === undefined
          ? null
          : forfeitedBy === p.id
            ? 'me'
            : myTeammates.some((t) => t.id === forfeitedBy)
              ? 'teammate'
              : 'opponent';

      this.gateway.emitToUser(p.id, 'teamduel:finished', {
        matchId,
        myTeammates,
        opponentTeam: match.teams[opponentTeamIndex],
        myTeamScore: teamScores[teamIndex],
        opponentTeamScore: teamScores[opponentTeamIndex],
        winnerIsMyTeam: winnerTeam === null ? null : winnerTeam === teamIndex,
        forfeitedBy: forfeitedByView,
        eloChange: change,
        newElo: rating.elo + change,
      });
    }

    for (const timer of match.disconnectTimers.values()) clearTimeout(timer);
    this.matches.delete(matchId);
    for (const p of players) this.playerToMatch.delete(p.id);
  }

  private async getOrCreateRating(userId: string) {
    return this.prisma.userRating.upsert({
      where: { userId },
      create: { userId, elo: STARTING_ELO },
      update: {},
    });
  }

  private async generateQuestions(avgElo: number): Promise<TeamDuelQuestion[]> {
    const skip = wordPoolSkipForElo(avgElo);
    let pool = await this.prisma.word.findMany({
      where: { meaningVi: { not: null } },
      orderBy: { frequencyRank: 'asc' },
      skip,
      take: POOL_SIZE,
    });
    if (pool.length < ROUNDS_PER_MATCH && skip > 0) {
      pool = await this.prisma.word.findMany({
        where: { meaningVi: { not: null } },
        orderBy: { frequencyRank: 'asc' },
        take: POOL_SIZE,
      });
    }
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
