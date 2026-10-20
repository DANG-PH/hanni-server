import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  diffCalendarDays,
  isoDateToUtcDate,
  localStudyDate,
} from '../../../common/time.util';
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
import { AppEvent, type StreakUpdatedPayload } from '../../../events/events';

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Cứ đủ 7 ngày liên tục lại được thưởng 1 "lá chắn" — dùng để giữ nguyên
 * chuỗi nếu lỡ nghỉ đúng 1 ngày (xem nhánh gap>1 trong advanceStreak()). */
const FREEZE_MILESTONE_DAYS = 7;
export const MAX_STREAK_FREEZE = 2;

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

  private async advanceStreak(userId: string, todayIso: string): Promise<void> {
    const streak = await findOrCreate(this.streaks, { userId });
    const lastIso = toIso(streak.lastActiveLocalDate);

    if (lastIso === todayIso) return; // đã tính hôm nay

    let current = streak.currentStreak;
    let freeze = streak.streakFreezeCount;

    if (!lastIso) {
      current = 1;
    } else {
      const gap = diffCalendarDays(lastIso, todayIso);
      if (gap === 1) {
        current += 1;
      } else if (gap > 1) {
        if (freeze > 0 && gap === 2) {
          freeze -= 1; // dùng 1 "streak freeze", giữ nguyên chuỗi
        } else {
          current = 1; // đứt chuỗi, hôm nay là ngày 1
        }
      } else {
        return; // gap <= 0: lệch đồng hồ / đổi timezone — bỏ qua
      }
    }

    // Thưởng 1 "lá chắn" (streak freeze) mỗi mốc 7 ngày liên tục, tối đa
    // MAX_STREAK_FREEZE cái tồn cùng lúc — trước đây streakFreezeCount chỉ
    // có logic TIÊU (ở nhánh gap>1 phía trên) mà không bao giờ được CẤP, nên
    // luôn kẹt ở 0 và không có tác dụng thật.
    if (
      current > 0 &&
      current % FREEZE_MILESTONE_DAYS === 0 &&
      freeze < MAX_STREAK_FREEZE
    ) {
      freeze += 1;
    }

    const longest = Math.max(streak.longestStreak, current);
    await this.streaks.update(
      { userId },
      {
        currentStreak: current,
        longestStreak: longest,
        streakFreezeCount: freeze,
        lastActiveLocalDate: isoDateToUtcDate(todayIso),
      },
    );

    const payload: StreakUpdatedPayload = {
      userId,
      currentStreak: current,
      longestStreak: longest,
    };
    this.events.emit(AppEvent.StreakUpdated, payload);
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

    let displayCurrent = streak.currentStreak;
    let active = false;
    if (lastIso === todayIso) {
      active = true;
    } else if (lastIso && diffCalendarDays(lastIso, todayIso) > 1) {
      displayCurrent = 0; // đã bỏ lỡ → chuỗi đứt cho tới khi học lại
    }

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
      currentStreak: displayCurrent,
      longestStreak: streak.longestStreak,
      streakFreezeCount: streak.streakFreezeCount,
      lastActiveLocalDate: lastIso,
      activeToday: active,
      goal: {
        type: goalType,
        value: goalValue,
        progress: goalProgress,
        met: activity?.goalMet ?? false,
      },
    };
  }

  /** Cấp 1 "lá chắn" streak (tối đa MAX_STREAK_FREEZE) cho sự kiện đáng
   * thưởng RIÊNG (vd giới thiệu bạn mới, xem ReferralsListener) — tách khỏi
   * mốc 7-ngày tự động ở advanceStreak(). */
  async grantFreeze(userId: string): Promise<void> {
    const streak = await findOrCreate(this.streaks, { userId });
    if (streak.streakFreezeCount >= MAX_STREAK_FREEZE) return;
    await this.streaks.increment({ userId }, 'streakFreezeCount', 1);
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
