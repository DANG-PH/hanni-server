-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ACHIEVEMENT_UNLOCKED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "achievementId" UUID;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
