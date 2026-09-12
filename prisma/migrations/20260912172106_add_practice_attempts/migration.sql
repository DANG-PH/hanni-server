-- CreateEnum
CREATE TYPE "PracticeSkill" AS ENUM ('LISTENING', 'PRONUNCIATION');

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "wordId" UUID NOT NULL,
    "skill" "PracticeSkill" NOT NULL,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_skill_createdAt_idx" ON "PracticeAttempt"("userId", "skill", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeAttempt_wordId_idx" ON "PracticeAttempt"("wordId");

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
