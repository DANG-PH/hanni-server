import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import type { Env } from '../../config/env.validation';
import {
  DailyQuestClaim,
  PracticeAttempt,
  QuizAttempt,
  ReviewLog,
  User,
} from '../../database/entities';
import {
  isoDateToUtcDate,
  localStudyDate,
  startOfLocalDayInstant,
} from '../../common/time.util';
import { insertIfAbsent } from '../../database/repository.util';
import {
  MAX_STREAK_FREEZE,
  StreakService,
} from '../gamification/streak/streak.service';
import { ALL_DONE_KEY, selectDailyQuests, type QuestKey } from './quest.util';

export interface QuestRow {
  key: QuestKey;
  title: string;
  progress: number;
  target: number;
  done: boolean;
}

export interface TodayQuests {
  quests: QuestRow[];
  allDone: boolean;
  /** Đã nhận lá chắn của hôm nay chưa (xong cả 3 lần đầu trong ngày thì server tự cấp). */
  rewardClaimed: boolean;
  /** Lần gọi này vừa cấp lá chắn — client hiện lời chúc mừng. */
  justEarnedFreeze: boolean;
  freezeCount: number;
  maxFreeze: number;
}

/**
 * Nhiệm vụ hàng ngày — tiến độ tính TRỰC TIẾP (live) từ dữ liệu đã có sẵn
 * (ReviewLog/QuizAttempt/PracticeAttempt), KHÔNG lưu counter riêng, giống
 * đúng cách tính điểm ở `LeagueService` — tránh lệch dữ liệu và không cần
 * nghe sự kiện từ nhiều nơi. Xong cả 3 nhiệm vụ → 1 lá chắn giữ chuỗi; bảng
 * `DailyQuestClaim` (dòng `all_done`) chặn cấp 2 lần trong cùng 1 ngày.
 */
@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(DailyQuestClaim)
    private readonly claims: Repository<DailyQuestClaim>,
    @InjectRepository(ReviewLog)
    private readonly reviewLogs: Repository<ReviewLog>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttempts: Repository<QuizAttempt>,
    @InjectRepository(PracticeAttempt)
    private readonly practiceAttempts: Repository<PracticeAttempt>,
    private readonly streak: StreakService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getToday(userId: string): Promise<TodayQuests> {
    const user = await this.users.findOneOrFail({
      where: { id: userId },
      // Có `select` thì cột của quan hệ cũng phải liệt kê (kèm khoá chính) — xem mục TypeORM ở CLAUDE.md.
      select: {
        id: true,
        timezone: true,
        streak: { userId: true, streakFreezeCount: true },
      },
      relations: { streak: true },
    });
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });
    const now = new Date();
    const dateIso = localStudyDate(now, user.timezone, cutoffHour);
    const dayStart = startOfLocalDayInstant(now, user.timezone, cutoffHour);
    const localDate = isoDateToUtcDate(dateIso);

    const templates = selectDailyQuests(userId, dateIso);
    const progressByKey = await this.computeProgress(
      userId,
      templates.map((t) => t.key),
      dayStart,
    );
    const quests: QuestRow[] = templates.map((t) => {
      const progress = Math.min(progressByKey.get(t.key) ?? 0, t.target);
      return {
        key: t.key,
        title: t.title,
        progress,
        target: t.target,
        done: progress >= t.target,
      };
    });
    const allDone = quests.every((q) => q.done);

    let rewardClaimed = await this.claims.existsBy({
      userId,
      localDate,
      questKey: ALL_DONE_KEY,
    });
    let justEarnedFreeze = false;
    // Ghi nhận TRƯỚC rồi mới cấp: 2 request cùng lúc thì ràng buộc unique (userId, localDate, questKey) chặn request sau.
    if (allDone && !rewardClaimed) {
      rewardClaimed = await insertIfAbsent(this.claims, {
        userId,
        localDate,
        questKey: ALL_DONE_KEY,
      });
      if (rewardClaimed)
        justEarnedFreeze = await this.streak.grantFreeze(userId);
    }

    return {
      quests,
      allDone,
      rewardClaimed,
      justEarnedFreeze,
      freezeCount:
        (user.streak?.streakFreezeCount ?? 0) + (justEarnedFreeze ? 1 : 0),
      maxFreeze: MAX_STREAK_FREEZE,
    };
  }

  private async computeProgress(
    userId: string,
    keys: QuestKey[],
    since: Date,
  ): Promise<Map<QuestKey, number>> {
    const result = new Map<QuestKey, number>();
    await Promise.all(
      keys.map(async (key) => {
        result.set(key, await this.countFor(userId, key, since));
      }),
    );
    return result;
  }

  private async countFor(
    userId: string,
    key: QuestKey,
    since: Date,
  ): Promise<number> {
    const fromToday = MoreThanOrEqual(since);
    switch (key) {
      case 'review_words':
        return this.reviewLogs.countBy({ userId, reviewedAt: fromToday });
      case 'new_words':
        return this.reviewLogs.countBy({
          userId,
          reviewedAt: fromToday,
          reviewType: 'LEARN',
        });
      case 'complete_quiz':
        return this.quizAttempts.countBy({ userId, completedAt: fromToday });
      case 'listening_practice':
        return this.practiceAttempts.countBy({
          userId,
          skill: 'LISTENING',
          isCorrect: true,
          createdAt: fromToday,
        });
      case 'pronunciation_practice':
        // KHÔNG lọc isCorrect: true như listening — ghi âm chỉ tự chấm được
        // trên Chrome/Edge (Web Speech API), trình duyệt khác vẫn ghi nhận
        // lượt luyện nhưng isCorrect = null (xem hanni-server/CLAUDE.md mục
        // luyện phát âm) — lọc theo đúng/sai sẽ khiến nhiệm vụ KHÔNG BAO GIỜ
        // hoàn thành được trên trình duyệt không hỗ trợ, tính theo lượt LUYỆN
        // (đã cố gắng nói ra từ) là đủ công bằng cho 1 nhiệm vụ hàng ngày.
        return this.practiceAttempts.countBy({
          userId,
          skill: 'PRONUNCIATION',
          createdAt: fromToday,
        });
    }
  }
}
