import type { ReviewRating, SrsState } from '@prisma/client';

/** Trạng thái 1 thẻ trước khi review + đánh giá của user. */
export interface SchedulerInput {
  state: SrsState;
  reps: number;
  lapses: number;
  easeFactor: number;
  intervalDays: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: Date | null;
  rating: ReviewRating;
  now: Date;
  timezone: string;
  cutoffHour: number;
  targetRetention: number;
}

/** Trạng thái mới + thời điểm hỏi lại. */
export interface SchedulerOutput {
  state: SrsState;
  reps: number;
  lapses: number;
  easeFactor: number;
  intervalDays: number;
  stability: number | null;
  difficulty: number | null;
  dueAt: Date;
  isCorrect: boolean;
}

export interface Scheduler {
  readonly name: 'sm2' | 'fsrs';
  schedule(input: SchedulerInput): SchedulerOutput;
}

export const SM2 = 'sm2' as const;
export const FSRS = 'fsrs' as const;
