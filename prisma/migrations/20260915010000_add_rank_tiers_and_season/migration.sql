-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('TRANSLATE', 'LISTENING');

-- AlterTable MinigameSession: thêm cột mode
ALTER TABLE "MinigameSession" ADD COLUMN "mode" "GameMode" NOT NULL DEFAULT 'TRANSLATE';

-- AlterTable DuelMatch: thêm cột forfeitedUserId
ALTER TABLE "DuelMatch" ADD COLUMN "forfeitedUserId" UUID;

-- CreateTable DuelSeason
CREATE TABLE "DuelSeason" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "DuelSeason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DuelSeason_number_key" ON "DuelSeason"("number");

-- CreateTable DuelSeasonResult
CREATE TABLE "DuelSeasonResult" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "finalElo" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "coinsAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelSeasonResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DuelSeasonResult_seasonId_userId_key" ON "DuelSeasonResult"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "DuelSeasonResult_userId_idx" ON "DuelSeasonResult"("userId");

-- AddForeignKey
ALTER TABLE "DuelSeasonResult" ADD CONSTRAINT "DuelSeasonResult_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "DuelSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelSeasonResult" ADD CONSTRAINT "DuelSeasonResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
