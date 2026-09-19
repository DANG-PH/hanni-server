-- CreateTable
CREATE TABLE "DailyQuestClaim" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "localDate" DATE NOT NULL,
    "questKey" TEXT NOT NULL,
    "xu" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuestClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuestClaim_userId_localDate_questKey_key" ON "DailyQuestClaim"("userId", "localDate", "questKey");

-- CreateIndex
CREATE INDEX "DailyQuestClaim_userId_localDate_idx" ON "DailyQuestClaim"("userId", "localDate");

-- AddForeignKey
ALTER TABLE "DailyQuestClaim" ADD CONSTRAINT "DailyQuestClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
