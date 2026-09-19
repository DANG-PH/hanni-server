-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "equippedTitle" TEXT;

-- CreateTable
CREATE TABLE "UserTitle" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "titleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTitle_userId_titleKey_key" ON "UserTitle"("userId", "titleKey");

-- AddForeignKey
ALTER TABLE "UserTitle" ADD CONSTRAINT "UserTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
