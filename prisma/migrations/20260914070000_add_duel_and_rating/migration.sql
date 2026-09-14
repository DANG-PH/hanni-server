-- CreateTable
CREATE TABLE "UserRating" (
    "userId" UUID NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DuelMatch" (
    "id" UUID NOT NULL,
    "playerAId" UUID NOT NULL,
    "playerBId" UUID NOT NULL,
    "scoreA" INTEGER NOT NULL,
    "scoreB" INTEGER NOT NULL,
    "winnerId" UUID,
    "eloChangeA" INTEGER NOT NULL,
    "eloChangeB" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuelMatch_playerAId_idx" ON "DuelMatch"("playerAId");

-- CreateIndex
CREATE INDEX "DuelMatch_playerBId_idx" ON "DuelMatch"("playerBId");

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
