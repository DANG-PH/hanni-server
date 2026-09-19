-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "equippedFrame" TEXT;

-- CreateTable
CREATE TABLE "UserFrame" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "frameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFrame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFrame_userId_frameKey_key" ON "UserFrame"("userId", "frameKey");

-- AddForeignKey
ALTER TABLE "UserFrame" ADD CONSTRAINT "UserFrame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
