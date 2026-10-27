import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dọn cơ sở dữ liệu (2026-10-28): xoá bảng, cột, kiểu enum không còn code nào đọc/ghi — để mỗi bảng còn lại đều
 * đang dùng thật, đọc entity là biết hết dữ liệu của app.
 *
 * Bảng xoá: tính năng đã gỡ trước đó — nhắn tin + theo dõi (Conversation, DirectMessage, Follow), bình luận/thích
 * video (VideoComment, VideoLike), ví xu (UserWallet, CoinTransaction), đấu 1v1 (DuelMatch, DuelSeason,
 * DuelSeasonResult, UserRating), /exams cũ (ExamAttempt); buổi ôn StudySession và đáp án từng câu quiz QuizAnswer
 * (chỉ ghi, không chỗ nào đọc); `_prisma_migrations` (sổ migration của Prisma, đã chuyển TypeORM 2026-10-20).
 *
 * Cột xoá (chỉ ghi hoặc không ai dùng): token Google trong Account (Hanni chỉ cần danh tính `sub`), cột của tính năng
 * đã gỡ (Notification.actorId/videoId/commentId, UserSettings.equippedFrame, UserDailyActivity.xp,
 * PaymentOrder.xuAmount/kind, Achievement.iconUrl), cache không ai đọc (UserLevelProgress.reviewingWords/dueWords/
 * atRiskWords), số liệu HSK bản nháp 2021 không hiện ở đâu (HskLevel.isSharedBand/newWords2021/cumulative2021/skills),
 * RefreshToken.replacedById (luôn null), User.lastActiveAt (không chỗ nào ghi — hoạt động thật nằm ở UserDailyActivity), UserAchievement.progressValue, UserWordProgress.lastRating,
 * QuizAttempt.format/studySessionId, ReviewLog.studySessionId, UserSettings.newCardsPerDay (ô "từ mới mỗi ngày" không
 * còn điều khiển gì — từ mới chỉ đến từ bài học).
 *
 * Gộp: PaymentOrder.payosPaymentLinkId → providerRef (mã giao dịch phía cổng, dùng chung cho payOS và MoMo).
 *
 * KHÔNG hoàn tác được bằng migration (dữ liệu đã xoá) — muốn lấy lại thì khôi phục bản sao lưu chụp ngay trước khi
 * deploy (/root/backups/ trên VPS). Chạy lại an toàn (IF EXISTS).
 */
export class DropUnusedTables1792700000000 implements MigrationInterface {
  name = 'DropUnusedTables1792700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Chuyển dữ liệu còn cần trước khi xoá cột.
    if (await queryRunner.hasColumn('PaymentOrder', 'payosPaymentLinkId')) {
      await queryRunner.query(
        `UPDATE "PaymentOrder" SET "providerRef" = "payosPaymentLinkId" WHERE "providerRef" IS NULL AND "payosPaymentLinkId" IS NOT NULL`,
      );
    }

    // 2. Bảng không còn dùng (CASCADE gỡ luôn khoá ngoại từ bảng khác trỏ vào, vd Notification.commentId).
    for (const table of [
      'DirectMessage',
      'Conversation',
      'Follow',
      'VideoComment',
      'VideoLike',
      'CoinTransaction',
      'UserWallet',
      'DuelSeasonResult',
      'DuelMatch',
      'DuelSeason',
      'UserRating',
      'ExamAttempt',
      'QuizAnswer',
      'StudySession',
      '_prisma_migrations',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    // 3. Cột không còn dùng (xoá cột là xoá luôn index + khoá ngoại của cột đó).
    const columns: Record<string, string[]> = {
      Account: [
        'accessToken',
        'refreshToken',
        'expiresAt',
        'scope',
        'idToken',
        'tokenType',
      ],
      Achievement: ['iconUrl'],
      HskLevel: ['isSharedBand', 'newWords2021', 'cumulative2021', 'skills'],
      Notification: ['actorId', 'videoId', 'commentId'],
      PaymentOrder: ['xuAmount', 'kind', 'payosPaymentLinkId'],
      QuizAttempt: ['studySessionId', 'format'],
      RefreshToken: ['replacedById'],
      ReviewLog: ['studySessionId'],
      User: ['lastActiveAt'],
      UserAchievement: ['progressValue'],
      UserDailyActivity: ['xp'],
      UserLevelProgress: ['reviewingWords', 'dueWords', 'atRiskWords'],
      UserSettings: ['equippedFrame', 'newCardsPerDay'],
      UserWordProgress: ['lastRating'],
    };
    for (const [table, cols] of Object.entries(columns)) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ${cols.map((c) => `DROP COLUMN IF EXISTS "${c}"`).join(', ')}`,
      );
    }

    // 4. Kiểu enum chỉ các cột/bảng vừa xoá dùng.
    await queryRunner.query(
      `DROP TYPE IF EXISTS "StudySource", "PaymentOrderKind", "SkillType"`,
    );

    // 5. Bỏ 2 loại thông báo của tính năng đã gỡ (bình luận, theo dõi): xoá dòng cũ rồi dựng lại enum — Postgres không
    //    cho xoá thẳng 1 giá trị enum.
    await queryRunner.query(
      `DELETE FROM "Notification" WHERE "type"::text IN ('COMMENT_REPLY', 'NEW_FOLLOWER')`,
    );
    await queryRunner.query(
      `ALTER TYPE "NotificationType" RENAME TO "NotificationType_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "NotificationType" AS ENUM ('ACHIEVEMENT_UNLOCKED', 'CLASS_ASSIGNMENT', 'LEAGUE_RESULT', 'STREAK_SAVED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::text::"NotificationType"`,
    );
    await queryRunner.query(`DROP TYPE "NotificationType_old"`);
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'DropUnusedTables đã xoá dữ liệu — không hoàn tác bằng migration. Khôi phục bản sao lưu trong /root/backups/.',
      ),
    );
  }
}
