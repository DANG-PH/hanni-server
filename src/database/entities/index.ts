/**
 * Toàn bộ bảng của Hanni — mỗi file 1 bảng, tên class = tên bảng trong Postgres.
 * Bảng của tính năng đã gỡ (nhắn tin, theo dõi, bình luận video, ví xu, đấu 1v1, /exams cũ, buổi ôn StudySession,
 * đáp án từng câu quiz) đã XOÁ hẳn ở migration DropUnusedTables (28/10/2026, có bản sao lưu trước khi xoá).
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
import { UserLevelProgress } from './user-level-progress.entity';
import { UserLessonProgress } from './user-lesson-progress.entity';
import { UserDailyActivity } from './user-daily-activity.entity';
import { DailyQuestClaim } from './daily-quest-claim.entity';
import { UserStreak } from './user-streak.entity';
import { Achievement } from './achievement.entity';
import { UserAchievement } from './user-achievement.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { Video } from './video.entity';
import { VideoLine } from './video-line.entity';
import { UserVideoProgress } from './user-video-progress.entity';
import { GrammarPoint } from './grammar-point.entity';
import { MockExamAttempt } from './mock-exam-attempt.entity';
import { PushSubscription } from './push-subscription.entity';
import { Notification } from './notification.entity';
import { PracticeAttempt } from './practice-attempt.entity';
import { Referral } from './referral.entity';
import { MinigameSession } from './minigame-session.entity';
import { PaymentOrder } from './payment-order.entity';
import { LeagueWeek } from './league-week.entity';
import { LeagueEntry } from './league-entry.entity';
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
  UserLevelProgress,
  UserLessonProgress,
  UserDailyActivity,
  DailyQuestClaim,
  UserStreak,
  Achievement,
  UserAchievement,
  QuizAttempt,
  Video,
  VideoLine,
  UserVideoProgress,
  GrammarPoint,
  MockExamAttempt,
  PushSubscription,
  Notification,
  PracticeAttempt,
  Referral,
  MinigameSession,
  PaymentOrder,
  LeagueWeek,
  LeagueEntry,
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
  UserLevelProgress,
  UserLessonProgress,
  UserDailyActivity,
  DailyQuestClaim,
  UserStreak,
  Achievement,
  UserAchievement,
  QuizAttempt,
  Video,
  VideoLine,
  UserVideoProgress,
  GrammarPoint,
  MockExamAttempt,
  PushSubscription,
  Notification,
  PracticeAttempt,
  Referral,
  MinigameSession,
  PaymentOrder,
  LeagueWeek,
  LeagueEntry,
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
