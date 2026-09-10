import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GoalType, Prisma } from '@prisma/client';
import {
  diffCalendarDays,
  isoDateToUtcDate,
  localStudyDate,
} from '../../../common/time.util';
import type { Env } from '../../../config/env.validation';
import { AppEvent, type StreakUpdatedPayload } from '../../../events/events';
import { PrismaService } from '../../../infra/prisma/prisma.service';

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
    private readonly prisma: PrismaService,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!user) return;

    const todayIso = localStudyDate(at, user.timezone, this.cutoffHour);
    const localDate = isoDateToUtcDate(todayIso);
    const goalType = user.settings?.dailyGoalType ?? GoalType.WORDS;
    const goalValue = user.settings?.dailyGoalValue ?? 20;

    // 1) upsert bản ghi hoạt động của ngày hôm nay
    let wasNewDay = false;
    try {
      await this.prisma.userDailyActivity.create({
        data: {
          userId,
          localDate,
          wordsReviewed: delta.wordsReviewed ?? 0,
          wordsLearned: delta.wordsLearned ?? 0,
          minutesStudied: delta.minutesStudied ?? 0,
        },
      });
      wasNewDay = true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        await this.prisma.userDailyActivity.update({
          where: { userId_localDate: { userId, localDate } },
          data: {
            wordsReviewed: { increment: delta.wordsReviewed ?? 0 },
            wordsLearned: { increment: delta.wordsLearned ?? 0 },
            minutesStudied: { increment: delta.minutesStudied ?? 0 },
          },
        });
      } else {
        throw err;
      }
    }

    // 2) cập nhật goalMet
    const activity = await this.prisma.userDailyActivity.findUniqueOrThrow({
      where: { userId_localDate: { userId, localDate } },
    });
    const progress =
      goalType === GoalType.MINUTES
        ? activity.minutesStudied
        : activity.wordsReviewed;
    if (!activity.goalMet && progress >= goalValue) {
      await this.prisma.userDailyActivity.update({
        where: { userId_localDate: { userId, localDate } },
        data: { goalMet: true },
      });
    }

    // 3) nếu là hoạt động ĐẦU TIÊN của ngày → tính lại streak
    if (wasNewDay) {
      await this.advanceStreak(userId, todayIso);
    }
  }

  private async advanceStreak(userId: string, todayIso: string): Promise<void> {
    const streak = await this.prisma.userStreak.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
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

    const longest = Math.max(streak.longestStreak, current);
    await this.prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: current,
        longestStreak: longest,
        streakFreezeCount: freeze,
        lastActiveLocalDate: isoDateToUtcDate(todayIso),
      },
    });

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
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true },
      }),
      this.prisma.userStreak.upsert({
        where: { userId },
        create: { userId },
        update: {},
      }),
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

    const activity = await this.prisma.userDailyActivity.findUnique({
      where: {
        userId_localDate: { userId, localDate: isoDateToUtcDate(todayIso) },
      },
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

  /** Lịch sử hoạt động N ngày gần nhất (cho biểu đồ/lịch). */
  async history(userId: string, days = 30) {
    const rows = await this.prisma.userDailyActivity.findMany({
      where: { userId },
      orderBy: { localDate: 'desc' },
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
