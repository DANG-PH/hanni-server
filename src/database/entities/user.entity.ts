import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { ChatSession } from './chat-session.entity';
import { Classroom } from './classroom.entity';
import { ClassroomMember } from './classroom-member.entity';
import { DailyQuestClaim } from './daily-quest-claim.entity';
import { LeagueEntry } from './league-entry.entity';
import { MinigameSession } from './minigame-session.entity';
import { MockExamAttempt } from './mock-exam-attempt.entity';
import { Notification } from './notification.entity';
import { OnboardingProfile } from './onboarding-profile.entity';
import { PaymentOrder } from './payment-order.entity';
import { PracticeAttempt } from './practice-attempt.entity';
import { PushSubscription } from './push-subscription.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { Referral } from './referral.entity';
import { RefreshToken } from './refresh-token.entity';
import { ReviewLog } from './review-log.entity';
import { RoleplaySession } from './roleplay-session.entity';
import { UserAchievement } from './user-achievement.entity';
import { UserDailyActivity } from './user-daily-activity.entity';
import { UserLessonProgress } from './user-lesson-progress.entity';
import { UserLevelProgress } from './user-level-progress.entity';
import { UserSettings } from './user-settings.entity';
import { UserStreak } from './user-streak.entity';
import { UserVideoProgress } from './user-video-progress.entity';
import { UserWordProgress } from './user-word-progress.entity';

@Entity('User')
@Index('User_email_key', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'User_pkey' })
  id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  emailVerifiedAt!: Date | null;

  /** null nếu user chỉ đăng nhập bằng Google */
  @Column({ type: 'text', nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'text' })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  /** Tên timezone IANA (vd "Asia/Ho_Chi_Minh") — KHÔNG lưu offset, để xử lý đúng DST. */
  @Column({ type: 'text', default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @Column({ type: 'text', default: 'vi' })
  locale!: string;

  /** user | admin | translator */
  @Column({ type: 'text', default: 'user' })
  role!: string;

  /**
   * Hạn dùng Premium — null = chưa từng mua/đã hết hạn. Mốc xa (năm 2099)
   * = gói "trọn đời" (xem PREMIUM_LIFETIME_UNTIL ở premium-plans.ts), KHÔNG
   * tự động gia hạn định kỳ (payOS không hỗ trợ thu định kỳ) — mua thêm
   * khi đang Premium sẽ NỐI DÀI từ hạn cũ, không phải từ hôm nay.
   */
  @Column({ type: 'timestamp', precision: 3, nullable: true })
  premiumUntil!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToMany(() => Account, (x) => x.user)
  accounts!: Account[];

  @OneToMany(() => RefreshToken, (x) => x.user)
  refreshTokens!: RefreshToken[];

  @OneToOne(() => UserSettings, (x) => x.user)
  settings!: UserSettings | null;

  @OneToMany(() => UserWordProgress, (x) => x.user)
  wordProgress!: UserWordProgress[];

  @OneToMany(() => ReviewLog, (x) => x.user)
  reviewLogs!: ReviewLog[];

  @OneToMany(() => UserDailyActivity, (x) => x.user)
  dailyActivity!: UserDailyActivity[];

  @OneToOne(() => UserStreak, (x) => x.user)
  streak!: UserStreak | null;

  @OneToMany(() => UserAchievement, (x) => x.user)
  achievements!: UserAchievement[];

  @OneToMany(() => UserLevelProgress, (x) => x.user)
  levelProgress!: UserLevelProgress[];

  @OneToMany(() => UserLessonProgress, (x) => x.user)
  lessonProgress!: UserLessonProgress[];

  @OneToMany(() => QuizAttempt, (x) => x.user)
  quizAttempts!: QuizAttempt[];

  @OneToMany(() => UserVideoProgress, (x) => x.user)
  videoProgress!: UserVideoProgress[];

  @OneToMany(() => MockExamAttempt, (x) => x.user)
  mockExamAttempts!: MockExamAttempt[];

  @OneToMany(() => PushSubscription, (x) => x.user)
  pushSubscriptions!: PushSubscription[];

  @OneToMany(() => Notification, (x) => x.user)
  notifications!: Notification[];

  @OneToMany(() => PracticeAttempt, (x) => x.user)
  practiceAttempts!: PracticeAttempt[];

  @OneToOne(() => OnboardingProfile, (x) => x.user)
  onboarding!: OnboardingProfile | null;

  @OneToMany(() => ChatSession, (x) => x.user)
  chatSessions!: ChatSession[];

  @OneToMany(() => RoleplaySession, (x) => x.user)
  roleplaySessions!: RoleplaySession[];

  @OneToMany(() => Referral, (x) => x.referrer)
  referralsSent!: Referral[];

  @OneToOne(() => Referral, (x) => x.referred)
  referredBy!: Referral | null;

  @OneToMany(() => MinigameSession, (x) => x.user)
  minigameSessions!: MinigameSession[];

  @OneToMany(() => PaymentOrder, (x) => x.user)
  paymentOrders!: PaymentOrder[];

  @OneToMany(() => LeagueEntry, (x) => x.user)
  leagueEntries!: LeagueEntry[];

  @OneToMany(() => DailyQuestClaim, (x) => x.user)
  dailyQuestClaims!: DailyQuestClaim[];

  @OneToMany(() => Classroom, (x) => x.owner)
  classroomsOwned!: Classroom[];

  @OneToMany(() => ClassroomMember, (x) => x.user)
  classroomMembers!: ClassroomMember[];
}
