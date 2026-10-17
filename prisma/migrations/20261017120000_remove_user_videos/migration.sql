-- Bỏ tính năng người dùng tự thêm video (2026-10-17). Đã sao lưu trước khi xoá ở
-- backups/2026-10-17-remove-user-videos.json (1 video + 1.446 dòng phụ đề, 2 bình luận thử nghiệm).

-- Video do người dùng thêm; phụ đề, tiến độ, bình luận, lượt thích, thông báo đi theo (ON DELETE CASCADE).
DELETE FROM "Video" WHERE "createdById" IS NOT NULL;

-- Thông báo "bình luận / thích video bạn thêm" không còn nghĩa khi không ai thêm video nữa.
DELETE FROM "Notification" WHERE "type" IN ('VIDEO_COMMENT', 'VIDEO_LIKE');

-- Bình luận thử nghiệm còn sót trên production (câu trả lời của chúng xoá theo cascade).
DELETE FROM "VideoComment" WHERE "content" LIKE '[TEST-CC]%';

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('COMMENT_REPLY', 'NEW_FOLLOWER', 'ACHIEVEMENT_UNLOCKED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_createdById_fkey";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "createdById";
