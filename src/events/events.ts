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
  CommentCreated: 'comment.created',
  VideoLiked: 'video.liked',
  PracticeAttempted: 'practice.attempted',
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

export interface CommentCreatedPayload {
  commentId: string;
  videoId: string;
  authorId: string;
  /** null = bình luận gốc (không phải trả lời) */
  parentId: string | null;
}

export interface VideoLikedPayload {
  videoId: string;
  likerId: string;
}

export interface PracticeAttemptedPayload {
  userId: string;
  wordId: string;
  skill: 'LISTENING' | 'PRONUNCIATION';
  isCorrect: boolean | null;
  at: string; // ISO
}
