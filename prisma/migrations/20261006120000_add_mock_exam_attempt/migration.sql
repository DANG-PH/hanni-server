-- CreateTable
CREATE TABLE "MockExamAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "examSlug" TEXT NOT NULL,
    "hskLevel" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "sectionScores" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockExamAttempt_userId_createdAt_idx" ON "MockExamAttempt"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MockExamAttempt_userId_examSlug_idx" ON "MockExamAttempt"("userId", "examSlug");

-- AddForeignKey
ALTER TABLE "MockExamAttempt" ADD CONSTRAINT "MockExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

