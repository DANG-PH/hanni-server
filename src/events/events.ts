import type { ReviewRating } from '@prisma/client';

/**
 * Tên sự kiện nội bộ (dùng @nestjs/event-emitter, in-process).
 * Handler phải idempotent để sau này có thể chuyển sang hàng đợi (BullMQ) mà không đổi logic.
 */
export const AppEvent = {
  WordReviewed: 'word.reviewed',
  SessionEnded: 'session.ended',
  LevelCompleted: 'level.completed',
  StreakUpdated: 'streak.updated',
  QuizCompleted: 'quiz.completed',
} as const;

export interface WordReviewedPayload {
  userId: string;
  wordId: string;
  hskLevel: number;
  rating: ReviewRating;
  isCorrect: boolean;
  becameLearned: boolean;
  durationMs?: number;
  at: string; // ISO
}

export interface SessionEndedPayload {
  userId: string;
  studySessionId: string;
  cardsReviewed: number;
  cardsCorrect: number;
}

export interface LevelCompletedPayload {
  userId: string;
  hskLevel: number;
}

export interface StreakUpdatedPayload {
  userId: string;
  currentStreak: number;
  longestStreak: number;
}

export interface QuizCompletedPayload {
  userId: string;
  quizAttemptId: string;
  scorePct: number;
}
