/**
 * Kiểu liệt kê (enum) của Postgres — cùng tên, cùng giá trị như trong DB.
 * Mỗi enum vừa là object (`SrsState.NEW`) vừa là kiểu (`state: SrsState`).
 */

export const AuthProvider = {
  GOOGLE: 'GOOGLE',
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const VerificationTokenType = {
  EMAIL_VERIFY: 'EMAIL_VERIFY',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;
export type VerificationTokenType =
  (typeof VerificationTokenType)[keyof typeof VerificationTokenType];

/** 5 kỹ năng HSK 3.0: 听 说 读 写 译 */
export const SkillType = {
  LISTENING: 'LISTENING',
  SPEAKING: 'SPEAKING',
  READING: 'READING',
  WRITING: 'WRITING',
  TRANSLATION: 'TRANSLATION',
} as const;
export type SkillType = (typeof SkillType)[keyof typeof SkillType];

export const HskBand = {
  ELEMENTARY: 'ELEMENTARY',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const;
export type HskBand = (typeof HskBand)[keyof typeof HskBand];

export const WordPos = {
  NOUN: 'NOUN',
  VERB: 'VERB',
  ADJECTIVE: 'ADJECTIVE',
  ADVERB: 'ADVERB',
  PRONOUN: 'PRONOUN',
  NUMERAL: 'NUMERAL',
  MEASURE: 'MEASURE',
  CONJUNCTION: 'CONJUNCTION',
  PREPOSITION: 'PREPOSITION',
  PARTICLE: 'PARTICLE',
  INTERJECTION: 'INTERJECTION',
  IDIOM: 'IDIOM',
  PHRASE: 'PHRASE',
  OTHER: 'OTHER',
} as const;
export type WordPos = (typeof WordPos)[keyof typeof WordPos];

/** Trạng thái bản dịch tiếng Việt của 1 từ. */
export const TranslationStatus = {
  MISSING: 'MISSING',
  MACHINE: 'MACHINE',
  REVIEWED: 'REVIEWED',
  HUMAN: 'HUMAN',
} as const;
export type TranslationStatus =
  (typeof TranslationStatus)[keyof typeof TranslationStatus];

/** Trạng thái ghi nhớ của 1 thẻ theo từng user (SM-2 / FSRS dùng chung). */
export const SrsState = {
  NEW: 'NEW',
  LEARNING: 'LEARNING',
  REVIEW: 'REVIEW',
  RELEARNING: 'RELEARNING',
} as const;
export type SrsState = (typeof SrsState)[keyof typeof SrsState];

/** 4 nút đánh giá khi ôn (map sang chất lượng nhớ tùy thuật toán). */
export const ReviewRating = {
  AGAIN: 'AGAIN',
  HARD: 'HARD',
  GOOD: 'GOOD',
  EASY: 'EASY',
} as const;
export type ReviewRating = (typeof ReviewRating)[keyof typeof ReviewRating];

export const ReviewType = {
  LEARN: 'LEARN',
  REVIEW: 'REVIEW',
  RELEARN: 'RELEARN',
  CRAM: 'CRAM',
  QUIZ: 'QUIZ',
} as const;
export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const GoalType = {
  WORDS: 'WORDS',
  MINUTES: 'MINUTES',
} as const;
export type GoalType = (typeof GoalType)[keyof typeof GoalType];

export const AchievementCategory = {
  STREAK: 'STREAK',
  LEVEL: 'LEVEL',
  VOLUME: 'VOLUME',
  ACCURACY: 'ACCURACY',
  MILESTONE: 'MILESTONE',
} as const;
export type AchievementCategory =
  (typeof AchievementCategory)[keyof typeof AchievementCategory];

export const StudySource = {
  REVIEW: 'REVIEW',
  LEARN: 'LEARN',
  QUIZ: 'QUIZ',
} as const;
export type StudySource = (typeof StudySource)[keyof typeof StudySource];

export const VideoKind = {
  PODCAST: 'PODCAST',
  STORY: 'STORY',
  SONG: 'SONG',
  DIALOGUE: 'DIALOGUE',
  CLIP: 'CLIP',
  OTHER: 'OTHER',
} as const;
export type VideoKind = (typeof VideoKind)[keyof typeof VideoKind];

export const NotificationType = {
  /** Cũ (bình luận, theo dõi — đã gỡ 2026-10-20): còn trong DB, không tạo/hiện nữa. */
  COMMENT_REPLY: 'COMMENT_REPLY',
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  CLASS_ASSIGNMENT: 'CLASS_ASSIGNMENT',
  LEAGUE_RESULT: 'LEAGUE_RESULT',
  STREAK_SAVED: 'STREAK_SAVED',
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const PracticeSkill = {
  LISTENING: 'LISTENING',
  PRONUNCIATION: 'PRONUNCIATION',
} as const;
export type PracticeSkill = (typeof PracticeSkill)[keyof typeof PracticeSkill];

/**
 * Chế độ chơi minigame — chừa chỗ thêm chế độ mới (vd ghép cặp, điền pinyin)\nmà không cần đổi cấu trúc bảng.
 */
export const GameMode = {
  TRANSLATE: 'TRANSLATE',
  LISTENING: 'LISTENING',
  MATCH: 'MATCH',
  PINYIN: 'PINYIN',
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export const PaymentOrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type PaymentOrderStatus =
  (typeof PaymentOrderStatus)[keyof typeof PaymentOrderStatus];

export const PaymentOrderKind = {
  TOPUP: 'TOPUP',
  PREMIUM: 'PREMIUM',
} as const;
export type PaymentOrderKind =
  (typeof PaymentOrderKind)[keyof typeof PaymentOrderKind];

export const OnboardingGoal = {
  TRAVEL: 'TRAVEL',
  WORK: 'WORK',
  EXAM: 'EXAM',
  ACADEMIC: 'ACADEMIC',
  INTEREST: 'INTEREST',
  OTHER: 'OTHER',
} as const;
export type OnboardingGoal =
  (typeof OnboardingGoal)[keyof typeof OnboardingGoal];

export const ChatRole = {
  USER: 'USER',
  MODEL: 'MODEL',
} as const;
export type ChatRole = (typeof ChatRole)[keyof typeof ChatRole];

export const ClassAssignmentKind = {
  LESSON: 'LESSON',
  MOCK_EXAM: 'MOCK_EXAM',
} as const;
export type ClassAssignmentKind =
  (typeof ClassAssignmentKind)[keyof typeof ClassAssignmentKind];
