import { Injectable } from '@nestjs/common';
import { ReviewRating, SrsState } from '@prisma/client';
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';
import type { Scheduler, SchedulerInput, SchedulerOutput } from './scheduler.types';

const STATE_TO_FSRS: Record<SrsState, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};
const FSRS_TO_STATE: Record<number, SrsState> = {
  [State.New]: SrsState.NEW,
  [State.Learning]: SrsState.LEARNING,
  [State.Review]: SrsState.REVIEW,
  [State.Relearning]: SrsState.RELEARNING,
};
const RATING_TO_FSRS: Record<ReviewRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

/**
 * FSRS (Free Spaced Repetition Scheduler) v6 qua thư viện ts-fsrs.
 * Xem plan mục 3.2(c). Giữ đủ ReviewLog để về sau fit tham số riêng từng user.
 */
@Injectable()
export class FsrsScheduler implements Scheduler {
  readonly name = 'fsrs' as const;

  schedule(input: SchedulerInput): SchedulerOutput {
    const engine = fsrs(
      generatorParameters({ request_retention: input.targetRetention }),
    );

    const card: Card = createEmptyCard(input.now);
    if (input.stability != null && input.difficulty != null) {
      card.stability = input.stability;
      card.difficulty = input.difficulty;
      card.reps = input.reps;
      card.lapses = input.lapses;
      card.state = STATE_TO_FSRS[input.state];
      card.due = input.lastReviewedAt ?? input.now;
      if (input.lastReviewedAt) card.last_review = input.lastReviewedAt;
    }

    const { card: next } = engine.next(
      card,
      input.now,
      RATING_TO_FSRS[input.rating],
    );

    return {
      state: FSRS_TO_STATE[next.state] ?? SrsState.REVIEW,
      reps: next.reps,
      lapses: next.lapses,
      easeFactor: input.easeFactor, // FSRS không dùng EF; giữ nguyên
      intervalDays: next.scheduled_days,
      stability: next.stability,
      difficulty: next.difficulty,
      dueAt: next.due instanceof Date ? next.due : new Date(next.due),
      isCorrect: input.rating !== ReviewRating.AGAIN,
    };
  }
}
