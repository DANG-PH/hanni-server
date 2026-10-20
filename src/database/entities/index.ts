/**
 * Toàn bộ bảng của Hanni — mỗi file 1 bảng, tên class = tên bảng trong Postgres.
 *
 * Bảng CŨ còn giữ dữ liệu nhưng KHÔNG còn module nào dùng (tính năng đã gỡ, xoá bảng là mất dữ liệu không lấy lại
 * được nên chưa xoá): Follow, Conversation, DirectMessage (theo dõi + nhắn tin), VideoComment, VideoLike (bình luận,
 * thích video), UserWallet, CoinTransaction (ví xu), DuelMatch, DuelSeason, DuelSeasonResult, UserRating (đấu 1v1),
 * ExamAttempt (/exams cũ).
 */
import { User } from './user.entity';
import { Account } from './account.entity';
import { RefreshToken } from './refresh-token.entity';
import { VerificationToken } from './verification-token.entity';
import { UserSettings } from './user-settings.entity';
import { HskLevel } from './hsk-level.entity';
import { Lesson } from './lesson.entity';
import { LessonReading } from './lesson-reading.entity';
import { Word } from './word.entity';
import { WordExample } from './word-example.entity';
import { UserWordProgress } from './user-word-progress.entity';
import { ReviewLog } from './review-log.entity';
import { StudySession } from './study-session.entity';
import { UserLevelProgress } from './user-level-progress.entity';
import { UserLessonProgress } from './user-lesson-progress.entity';
import { UserDailyActivity } from './user-daily-activity.entity';
import { DailyQuestClaim } from './daily-quest-claim.entity';
import { UserStreak } from './user-streak.entity';
import { Achievement } from './achievement.entity';
import { UserAchievement } from './user-achievement.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizAnswer } from './quiz-answer.entity';
import { Video } from './video.entity';
import { VideoLine } from './video-line.entity';
import { UserVideoProgress } from './user-video-progress.entity';
import { VideoComment } from './video-comment.entity';
import { VideoLike } from './video-like.entity';
import { GrammarPoint } from './grammar-point.entity';
import { MockExamAttempt } from './mock-exam-attempt.entity';
import { ExamAttempt } from './exam-attempt.entity';
import { PushSubscription } from './push-subscription.entity';
import { Notification } from './notification.entity';
import { PracticeAttempt } from './practice-attempt.entity';
import { Follow } from './follow.entity';
import { Referral } from './referral.entity';
import { MinigameSession } from './minigame-session.entity';
import { UserWallet } from './user-wallet.entity';
import { CoinTransaction } from './coin-transaction.entity';
import { PaymentOrder } from './payment-order.entity';
import { UserRating } from './user-rating.entity';
import { DuelMatch } from './duel-match.entity';
import { DuelSeason } from './duel-season.entity';
import { DuelSeasonResult } from './duel-season-result.entity';
import { LeagueWeek } from './league-week.entity';
import { LeagueEntry } from './league-entry.entity';
import { Conversation } from './conversation.entity';
import { DirectMessage } from './direct-message.entity';
import { OnboardingProfile } from './onboarding-profile.entity';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { RoleplaySession } from './roleplay-session.entity';
import { RoleplayMessage } from './roleplay-message.entity';
import { Classroom } from './classroom.entity';
import { ClassroomMember } from './classroom-member.entity';
import { ClassAssignment } from './class-assignment.entity';
import { PartnerLead } from './partner-lead.entity';

export {
  User,
  Account,
  RefreshToken,
  VerificationToken,
  UserSettings,
  HskLevel,
  Lesson,
  LessonReading,
  Word,
  WordExample,
  UserWordProgress,
  ReviewLog,
  StudySession,
  UserLevelProgress,
  UserLessonProgress,
  UserDailyActivity,
  DailyQuestClaim,
  UserStreak,
  Achievement,
  UserAchievement,
  QuizAttempt,
  QuizAnswer,
  Video,
  VideoLine,
  UserVideoProgress,
  VideoComment,
  VideoLike,
  GrammarPoint,
  MockExamAttempt,
  ExamAttempt,
  PushSubscription,
  Notification,
  PracticeAttempt,
  Follow,
  Referral,
  MinigameSession,
  UserWallet,
  CoinTransaction,
  PaymentOrder,
  UserRating,
  DuelMatch,
  DuelSeason,
  DuelSeasonResult,
  LeagueWeek,
  LeagueEntry,
  Conversation,
  DirectMessage,
  OnboardingProfile,
  ChatSession,
  ChatMessage,
  RoleplaySession,
  RoleplayMessage,
  Classroom,
  ClassroomMember,
  ClassAssignment,
  PartnerLead,
};

export const ENTITIES = [
  User,
  Account,
  RefreshToken,
  VerificationToken,
  UserSettings,
  HskLevel,
  Lesson,
  LessonReading,
  Word,
  WordExample,
  UserWordProgress,
  ReviewLog,
  StudySession,
  UserLevelProgress,
  UserLessonProgress,
  UserDailyActivity,
  DailyQuestClaim,
  UserStreak,
  Achievement,
  UserAchievement,
  QuizAttempt,
  QuizAnswer,
  Video,
  VideoLine,
  UserVideoProgress,
  VideoComment,
  VideoLike,
  GrammarPoint,
  MockExamAttempt,
  ExamAttempt,
  PushSubscription,
  Notification,
  PracticeAttempt,
  Follow,
  Referral,
  MinigameSession,
  UserWallet,
  CoinTransaction,
  PaymentOrder,
  UserRating,
  DuelMatch,
  DuelSeason,
  DuelSeasonResult,
  LeagueWeek,
  LeagueEntry,
  Conversation,
  DirectMessage,
  OnboardingProfile,
  ChatSession,
  ChatMessage,
  RoleplaySession,
  RoleplayMessage,
  Classroom,
  ClassroomMember,
  ClassAssignment,
  PartnerLead,
];
