-- DropIndex
DROP INDEX "Video_createdAt_idx";

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "GrammarPoint" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "hskLevel" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "titleVi" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "summaryVi" TEXT NOT NULL,
    "explanationVi" TEXT NOT NULL,
    "patterns" TEXT[],
    "examples" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "hskLevel" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarPoint_slug_key" ON "GrammarPoint"("slug");

-- CreateIndex
CREATE INDEX "GrammarPoint_hskLevel_orderIndex_idx" ON "GrammarPoint"("hskLevel", "orderIndex");

-- CreateIndex
CREATE INDEX "ExamAttempt_userId_createdAt_idx" ON "ExamAttempt"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Video_sortOrder_createdAt_idx" ON "Video"("sortOrder", "createdAt");

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
