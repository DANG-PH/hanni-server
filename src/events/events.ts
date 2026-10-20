import type { ReviewRating } from '../database/enums';

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
  PracticeAttempted: 'practice.attempted',
  AchievementUnlocked: 'achievement.unlocked',
  /** Lá chắn vừa giữ chuỗi ngày khi người học lỡ đúng 1 ngày. */
  StreakFreezeUsed: 'streak.freeze-used',
  /** Chốt 1 tuần giải đấu — 1 sự kiện cho mỗi người tham gia. */
  LeagueResult: 'league.result',
  /** Giáo viên giao bài mới cho cả lớp. */
  ClassAssignmentCreated: 'classroom.assignment-created',
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

export interface PracticeAttemptedPayload {
  userId: string;
  wordId: string;
  skill: 'LISTENING' | 'PRONUNCIATION';
  isCorrect: boolean | null;
  at: string; // ISO
}

export interface AchievementUnlockedPayload {
  userId: string;
  achievementId: string;
}

export interface StreakFreezeUsedPayload {
  userId: string;
  currentStreak: number;
  freezeLeft: number;
}

export interface LeagueResultPayload {
  userId: string;
  tierName: string;
  nextTierName: string;
  movement: 'up' | 'down' | 'stay';
  rank: number;
  groupSize: number;
  points: number;
}

export interface ClassAssignmentCreatedPayload {
  memberIds: string[];
  teacherName: string;
  className: string;
  /** vd "HSK 1 · Bài 2: Đại từ nhân xưng" hoặc "Thi thử HSK 1 — Đề 1" */
  title: string;
  href: string;
  dueAt: Date | null;
}
