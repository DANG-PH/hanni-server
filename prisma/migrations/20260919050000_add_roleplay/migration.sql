-- CreateTable
CREATE TABLE "RoleplaySession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scenarioKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleplaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleplayMessage" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "text" VARCHAR(2000) NOT NULL,
    "pinyin" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleplayMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleplaySession_userId_updatedAt_idx" ON "RoleplaySession"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "RoleplayMessage_sessionId_createdAt_idx" ON "RoleplayMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoleplaySession" ADD CONSTRAINT "RoleplaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleplayMessage" ADD CONSTRAINT "RoleplayMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RoleplaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
