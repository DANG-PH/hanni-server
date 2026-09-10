-- CreateEnum
CREATE TYPE "VideoKind" AS ENUM ('PODCAST', 'STORY', 'SONG', 'DIALOGUE', 'CLIP', 'OTHER');

-- CreateTable
CREATE TABLE "Video" (
    "id" UUID NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "description" TEXT,
    "hskLevel" INTEGER,
    "kind" "VideoKind" NOT NULL DEFAULT 'PODCAST',
    "sentenceCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,
    "author" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoLine" (
    "id" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "startMs" INTEGER,
    "zh" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "pinyinNum" TEXT NOT NULL DEFAULT '',
    "vi" TEXT,

    CONSTRAINT "VideoLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVideoProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "lastLineIndex" INTEGER NOT NULL DEFAULT 0,
    "linesRead" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVideoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_hskLevel_idx" ON "Video"("hskLevel");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");

-- CreateIndex
CREATE INDEX "VideoLine_videoId_idx" ON "VideoLine"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoLine_videoId_index_key" ON "VideoLine"("videoId", "index");

-- CreateIndex
CREATE INDEX "UserVideoProgress_userId_idx" ON "UserVideoProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserVideoProgress_userId_videoId_key" ON "UserVideoProgress"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoLine" ADD CONSTRAINT "VideoLine_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVideoProgress" ADD CONSTRAINT "UserVideoProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVideoProgress" ADD CONSTRAINT "UserVideoProgress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
