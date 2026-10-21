import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isoDateToUtcDate, localStudyDate } from '../../../common/time.util';
import type { Env } from '../../../config/env.validation';
import {
  User,
  UserDailyActivity,
  UserStreak,
} from '../../../database/entities';
import { GoalType } from '../../../database/enums';
import {
  findOrCreate,
  insertIfAbsent,
} from '../../../database/repository.util';
import {
  AppEvent,
  type StreakFreezeUsedPayload,
  type StreakUpdatedPayload,
} from '../../../events/events';
import { displayStreak, MAX_STREAK_FREEZE, nextStreak } from './streak.util';

export { MAX_STREAK_FREEZE };

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

interface ActivityDelta {
  wordsReviewed?: number;
  wordsLearned?: number;
  minutesStudied?: number;
}

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserDailyActivity)
    private readonly activities: Repository<UserDailyActivity>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get cutoffHour(): number {
    return this.config.get('STREAK_DAY_CUTOFF_HOUR', { infer: true });
  }

  /** Ghi nhận 1 hoạt động học. Trả về streak hiện tại sau khi cập nhật. */
  async recordActivity(
    userId: string,
    at: Date,
    delta: ActivityDelta,
  ): Promise<void> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { settings: true },
    });
    if (!user) return;

    const todayIso = localStudyDate(at, user.timezone, this.cutoffHour);
    const localDate = isoDateToUtcDate(todayIso);
    const goalType = user.settings?.dailyGoalType ?? GoalType.WORDS;
    const goalValue = user.settings?.dailyGoalValue ?? 20;

    // 1) bản ghi hoạt động của ngày hôm nay: chưa có thì tạo, có rồi thì cộng dồn
    const added = {
      reviewed: delta.wordsReviewed ?? 0,
      learned: delta.wordsLearned ?? 0,
      minutes: delta.minutesStudied ?? 0,
    };
    const wasNewDay = await insertIfAbsent(this.activities, {
      userId,
      localDate,
      wordsReviewed: added.reviewed,
      wordsLearned: added.learned,
      minutesStudied: added.minutes,
    });
    if (!wasNewDay) {
      await this.activities
        .createQueryBuilder()
        .update()
        .set({
          wordsReviewed: () => '"wordsReviewed" + :reviewed',
          wordsLearned: () => '"wordsLearned" + :learned',
          minutesStudied: () => '"minutesStudied" + :minutes',
        })
        .where({ userId, localDate })
        .setParameters(added)
        .execute();
    }

    // 2) cập nhật goalMet
    const activity = await this.activities.findOneByOrFail({
      userId,
      localDate,
    });
    const progress =
      goalType === GoalType.MINUTES
        ? activity.minutesStudied
        : activity.wordsReviewed;
    if (!activity.goalMet && progress >= goalValue) {
      await this.activities.update({ userId, localDate }, { goalMet: true });
    }

    // 3) nếu là hoạt động ĐẦU TIÊN của ngày → tính lại streak
    if (wasNewDay) {
      await this.advanceStreak(userId, todayIso);
    }
  }

  /** Cập nhật chuỗi khi có hoạt động ĐẦU TIÊN của ngày — luật nằm ở `nextStreak()` (streak.util.ts). */
  private async advanceStreak(userId: string, todayIso: string): Promise<void> {
    const streak = await findOrCreate(this.streaks, { userId });
    const step = nextStreak(
      {
        current: streak.currentStreak,
        freeze: streak.streakFreezeCount,
        lastIso: toIso(streak.lastActiveLocalDate),
      },
      todayIso,
    );
    if (!step) return; // hôm nay đã tính rồi

    const current = step.current;
    const longest = Math.max(streak.longestStreak, current);
    await this.streaks.update(
      { userId },
      {
        currentStreak: current,
        longestStreak: longest,
        streakFreezeCount: step.freeze,
        lastActiveLocalDate: isoDateToUtcDate(todayIso),
      },
    );

    const payload: StreakUpdatedPayload = {
      userId,
      currentStreak: current,
      longestStreak: longest,
    };
    this.events.emit(AppEvent.StreakUpdated, payload);
    if (step.usedFreeze) {
      const used: StreakFreezeUsedPayload = {
        userId,
        currentStreak: current,
        freezeLeft: step.freeze,
      };
      this.events.emit(AppEvent.StreakFreezeUsed, used);
    }
  }

  /** Đọc streak để hiển thị — có kiểm tra "đứt chuỗi" theo ngày local hiện tại. */
  async getStreak(userId: string) {
    const [user, streak] = await Promise.all([
      this.users.findOne({
        where: { id: userId },
        relations: { settings: true },
      }),
      findOrCreate(this.streaks, { userId }),
    ]);
    if (!user) return null;

    const todayIso = localStudyDate(new Date(), user.timezone, this.cutoffHour);
    const lastIso = toIso(streak.lastActiveLocalDate);
    const shown = displayStreak(
      {
        current: streak.currentStreak,
        freeze: streak.streakFreezeCount,
        lastIso,
      },
      todayIso,
    );

    const activity = await this.activities.findOneBy({
      userId,
      localDate: isoDateToUtcDate(todayIso),
    });
    const goalType = user.settings?.dailyGoalType ?? GoalType.WORDS;
    const goalValue = user.settings?.dailyGoalValue ?? 20;
    const goalProgress = activity
      ? goalType === GoalType.MINUTES
        ? activity.minutesStudied
        : activity.wordsReviewed
      : 0;

    return {
      currentStreak: shown.current,
      longestStreak: streak.longestStreak,
      streakFreezeCount: streak.streakFreezeCount,
      lastActiveLocalDate: lastIso,
      activeToday: shown.activeToday,
      /** Hôm qua lỡ nghỉ nhưng còn lá chắn — học hôm nay là chuỗi được giữ. */
      savedByFreeze: shown.savedByFreeze,
      goal: {
        type: goalType,
        value: goalValue,
        progress: goalProgress,
        met: activity?.goalMet ?? false,
      },
    };
  }

  /** Cấp 1 "lá chắn" streak (tối đa MAX_STREAK_FREEZE) cho sự kiện đáng thưởng RIÊNG (mời bạn — ReferralsListener,
   * xong cả 3 nhiệm vụ ngày — QuestsService), tách khỏi mốc 7 ngày tự động ở advanceStreak(). Trả false nếu đã đủ. */
  async grantFreeze(userId: string): Promise<boolean> {
    const streak = await findOrCreate(this.streaks, { userId });
    if (streak.streakFreezeCount >= MAX_STREAK_FREEZE) return false;
    await this.streaks.increment({ userId }, 'streakFreezeCount', 1);
    return true;
  }

  /** Lịch sử hoạt động N ngày gần nhất (cho biểu đồ/lịch). */
  async history(userId: string, days = 30) {
    const rows = await this.activities.find({
      where: { userId },
      order: { localDate: 'DESC' },
      take: days,
    });
    return rows.map((r) => ({
      date: toIso(r.localDate),
      wordsReviewed: r.wordsReviewed,
      minutesStudied: r.minutesStudied,
      goalMet: r.goalMet,
    }));
  }
}
