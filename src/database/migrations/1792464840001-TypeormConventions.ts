import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đưa DB do Prisma tạo (production) về đúng chuẩn TypeORM — chỉ đổi DEFAULT và 1 ràng buộc, KHÔNG đụng dữ liệu.
 * - Prisma tự sinh `id` (uuid) và `updatedAt` ở phía ứng dụng nên cột không có DEFAULT; TypeORM để DB tự sinh.
 * - Default thời gian ghi thống nhất `now()` (Prisma ghi lẫn `CURRENT_TIMESTAMP` — cùng nghĩa).
 * - `Referral.referredId`: unique index của Prisma → ràng buộc unique mà TypeORM tạo cho quan hệ 1-1.
 * DB tạo mới bằng `InitialSchema` đã đúng chuẩn nên bỏ qua (không có bảng `_prisma_migrations`).
 */
export class TypeormConventions1792464840001 implements MigrationInterface {
  name = 'TypeormConventions1792464840001';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('_prisma_migrations'))) return;
    for (const [table, column] of UUID_IDS)
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT gen_random_uuid()`,
      );
    for (const [table, column] of TIMESTAMPS)
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT now()`,
      );
    await queryRunner.query(
      `ALTER TABLE "Word" ALTER COLUMN "measureWords" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "Referral_referredId_key"`);
    await queryRunner.query(
      `ALTER TABLE "Referral" ADD CONSTRAINT "REL_7014dfd430044d1e280e2c6291" UNIQUE ("referredId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('_prisma_migrations'))) return;
    await queryRunner.query(
      `ALTER TABLE "Referral" DROP CONSTRAINT "REL_7014dfd430044d1e280e2c6291"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId")`,
    );
    for (const [table, column] of UUID_IDS)
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
    for (const [table, column] of TIMESTAMPS.filter(
      ([, c]) => c === 'updatedAt',
    ))
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
  }
}

/** Khoá chính uuid (Prisma `@default(uuid())`). */
const UUID_IDS: [string, string][] = [
  ['Account', 'id'],
  ['ChatMessage', 'id'],
  ['ChatSession', 'id'],
  ['UserLevelProgress', 'id'],
  ['PracticeAttempt', 'id'],
  ['QuizAnswer', 'id'],
  ['QuizAttempt', 'id'],
  ['StudySession', 'id'],
  ['ReviewLog', 'id'],
  ['UserWordProgress', 'id'],
  ['WordExample', 'id'],
  ['Word', 'id'],
  ['UserLessonProgress', 'id'],
  ['Lesson', 'id'],
  ['ClassAssignment', 'id'],
  ['Classroom', 'id'],
  ['CoinTransaction', 'id'],
  ['DirectMessage', 'id'],
  ['Conversation', 'id'],
  ['DailyQuestClaim', 'id'],
  ['DuelMatch', 'id'],
  ['DuelSeason', 'id'],
  ['DuelSeasonResult', 'id'],
  ['ExamAttempt', 'id'],
  ['Follow', 'id'],
  ['LeagueWeek', 'id'],
  ['LeagueEntry', 'id'],
  ['MinigameSession', 'id'],
  ['MockExamAttempt', 'id'],
  ['UserAchievement', 'id'],
  ['Achievement', 'id'],
  ['UserVideoProgress', 'id'],
  ['VideoComment', 'id'],
  ['VideoLike', 'id'],
  ['VideoLine', 'id'],
  ['Video', 'id'],
  ['Notification', 'id'],
  ['PaymentOrder', 'id'],
  ['PushSubscription', 'id'],
  ['Referral', 'id'],
  ['RefreshToken', 'id'],
  ['RoleplayMessage', 'id'],
  ['RoleplaySession', 'id'],
  ['UserDailyActivity', 'id'],
  ['User', 'id'],
  ['VerificationToken', 'id'],
  ['GrammarPoint', 'id'],
  ['PartnerLead', 'id'],
];

/** Cột thời gian có default (createdAt…) + mọi cột `updatedAt` (Prisma `@updatedAt`, trước đây không có default). */
const TIMESTAMPS: [string, string][] = [
  ['Account', 'createdAt'],
  ['Account', 'updatedAt'],
  ['ChatMessage', 'createdAt'],
  ['ChatSession', 'createdAt'],
  ['ChatSession', 'updatedAt'],
  ['UserLevelProgress', 'updatedAt'],
  ['PracticeAttempt', 'createdAt'],
  ['QuizAttempt', 'startedAt'],
  ['StudySession', 'startedAt'],
  ['ReviewLog', 'reviewedAt'],
  ['UserWordProgress', 'createdAt'],
  ['UserWordProgress', 'updatedAt'],
  ['Word', 'createdAt'],
  ['Word', 'updatedAt'],
  ['LessonReading', 'createdAt'],
  ['UserLessonProgress', 'updatedAt'],
  ['ClassAssignment', 'createdAt'],
  ['ClassroomMember', 'joinedAt'],
  ['Classroom', 'createdAt'],
  ['CoinTransaction', 'createdAt'],
  ['DirectMessage', 'createdAt'],
  ['Conversation', 'createdAt'],
  ['Conversation', 'updatedAt'],
  ['DailyQuestClaim', 'createdAt'],
  ['DuelMatch', 'createdAt'],
  ['DuelSeason', 'startedAt'],
  ['DuelSeasonResult', 'createdAt'],
  ['ExamAttempt', 'createdAt'],
  ['Follow', 'createdAt'],
  ['LeagueWeek', 'startedAt'],
  ['LeagueEntry', 'createdAt'],
  ['MinigameSession', 'startedAt'],
  ['MockExamAttempt', 'createdAt'],
  ['UserAchievement', 'unlockedAt'],
  ['UserVideoProgress', 'updatedAt'],
  ['VideoComment', 'createdAt'],
  ['VideoComment', 'updatedAt'],
  ['VideoLike', 'createdAt'],
  ['Video', 'createdAt'],
  ['Video', 'updatedAt'],
  ['Notification', 'createdAt'],
  ['OnboardingProfile', 'completedAt'],
  ['OnboardingProfile', 'updatedAt'],
  ['PaymentOrder', 'createdAt'],
  ['PushSubscription', 'createdAt'],
  ['Referral', 'createdAt'],
  ['RefreshToken', 'createdAt'],
  ['RoleplayMessage', 'createdAt'],
  ['RoleplaySession', 'createdAt'],
  ['RoleplaySession', 'updatedAt'],
  ['UserDailyActivity', 'createdAt'],
  ['UserDailyActivity', 'updatedAt'],
  ['UserRating', 'updatedAt'],
  ['UserSettings', 'updatedAt'],
  ['UserStreak', 'updatedAt'],
  ['UserWallet', 'updatedAt'],
  ['User', 'createdAt'],
  ['User', 'updatedAt'],
  ['VerificationToken', 'createdAt'],
  ['GrammarPoint', 'createdAt'],
  ['GrammarPoint', 'updatedAt'],
  ['PartnerLead', 'createdAt'],
];
