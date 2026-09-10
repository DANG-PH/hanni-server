import { Injectable } from '@nestjs/common';
import { ReviewRating, SrsState } from '@prisma/client';
import { endOfLocalDay } from '../../../common/time.util';
import type { Scheduler, SchedulerInput, SchedulerOutput } from './scheduler.types';

const MIN_EF = 1.3;
const LEECH_LAPSES = 8;

/** rating → chất lượng nhớ q (thang SM-2 0..5). */
const Q: Record<ReviewRating, number> = {
  AGAIN: 2,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
};

function clampEf(ef: number): number {
  return Math.max(MIN_EF, ef);
}

function fuzz(days: number): number {
  if (days < 2.5) return days;
  const factor = 0.95 + Math.random() * 0.1; // ±5%
  return Math.round(days * factor);
}

/**
 * SM-2 kiểu Anki. Xem plan mục 3.2(a).
 * - Thẻ mới/đang học: bước phút (1' / 10') rồi tốt nghiệp.
 * - Thẻ REVIEW: interval = round(interval * EF), EF cập nhật theo q.
 * - Quên (AGAIN) ở REVIEW: vào RELEARNING, lapses++, hạ EF 0.2.
 */
@Injectable()
export class Sm2Scheduler implements Scheduler {
  readonly name = 'sm2' as const;

  schedule(input: SchedulerInput): SchedulerOutput {
    const { rating } = input;
    const isCorrect = rating !== ReviewRating.AGAIN;
    const q = Q[rating];

    let { state, reps, lapses, easeFactor, intervalDays } = input;
    let dueAt: Date;

    const dayDue = (days: number): Date =>
      endOfLocalDay(input.now, input.timezone, input.cutoffHour)
        .plus({ days: Math.max(0, days - 1) })
        .toJSDate();
    const minutesDue = (min: number): Date =>
      new Date(input.now.getTime() + min * 60_000);

    if (state === SrsState.NEW || state === SrsState.LEARNING) {
      if (rating === ReviewRating.AGAIN) {
        state = SrsState.LEARNING;
        reps = 0;
        dueAt = minutesDue(1);
      } else if (rating === ReviewRating.HARD) {
        state = SrsState.LEARNING;
        dueAt = minutesDue(6);
      } else if (rating === ReviewRating.GOOD) {
        if (reps < 1) {
          state = SrsState.LEARNING;
          reps = 1;
          dueAt = minutesDue(10);
        } else {
          state = SrsState.REVIEW;
          reps = 1;
          intervalDays = 1;
          dueAt = dayDue(1);
        }
      } else {
        // EASY — tốt nghiệp ngay
        state = SrsState.REVIEW;
        reps = 1;
        intervalDays = 4;
        dueAt = dayDue(4);
      }
      return { state, reps, lapses, easeFactor, intervalDays, stability: null, difficulty: null, dueAt, isCorrect };
    }

    if (state === SrsState.RELEARNING) {
      if (rating === ReviewRating.AGAIN) {
        dueAt = minutesDue(10);
      } else if (rating === ReviewRating.EASY) {
        state = SrsState.REVIEW;
        intervalDays = 3;
        dueAt = dayDue(3);
      } else {
        state = SrsState.REVIEW;
        intervalDays = Math.max(1, Math.round(intervalDays * 0.5)) || 1;
        dueAt = dayDue(intervalDays);
      }
      return { state, reps, lapses, easeFactor, intervalDays, stability: null, difficulty: null, dueAt, isCorrect };
    }

    // state === REVIEW
    if (rating === ReviewRating.AGAIN) {
      lapses += 1;
      reps = 0;
      state = SrsState.RELEARNING;
      easeFactor = clampEf(easeFactor - 0.2);
      intervalDays = Math.max(1, Math.round(intervalDays * 0.3));
      dueAt = minutesDue(10);
    } else {
      if (rating === ReviewRating.HARD) {
        easeFactor = clampEf(easeFactor - 0.15);
        intervalDays = fuzz(Math.max(1, intervalDays * 1.2));
      } else if (rating === ReviewRating.GOOD) {
        easeFactor = clampEf(
          easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
        );
        intervalDays =
          reps <= 1 ? 6 : fuzz(Math.max(1, Math.round(intervalDays * easeFactor)));
      } else {
        // EASY
        easeFactor = clampEf(easeFactor + 0.15);
        intervalDays = fuzz(Math.max(1, Math.round(intervalDays * easeFactor * 1.3)));
      }
      reps += 1;
      dueAt = dayDue(intervalDays);
    }

    return {
      state,
      reps,
      lapses,
      easeFactor,
      intervalDays,
      stability: null,
      difficulty: null,
      dueAt,
      isCorrect,
    };
  }
}

export { LEECH_LAPSES };
