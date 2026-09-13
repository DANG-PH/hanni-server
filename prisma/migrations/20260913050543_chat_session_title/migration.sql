-- DropIndex
DROP INDEX "ChatSession_userId_idx";

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "title" TEXT;

-- CreateIndex
CREATE INDEX "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt" DESC);
