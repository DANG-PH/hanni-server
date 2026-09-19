-- CreateTable LeagueWeek
CREATE TABLE "LeagueWeek" (
    "id" UUID NOT NULL,
    "weekKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LeagueWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueWeek_weekKey_key" ON "LeagueWeek"("weekKey");

-- CreateTable LeagueEntry
CREATE TABLE "LeagueEntry" (
    "id" UUID NOT NULL,
    "weekId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tier" INTEGER NOT NULL,
    "finalPoints" INTEGER,
    "movement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueEntry_weekId_userId_key" ON "LeagueEntry"("weekId", "userId");

-- CreateIndex
CREATE INDEX "LeagueEntry_weekId_tier_idx" ON "LeagueEntry"("weekId", "tier");

-- AddForeignKey
ALTER TABLE "LeagueEntry" ADD CONSTRAINT "LeagueEntry_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "LeagueWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEntry" ADD CONSTRAINT "LeagueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
