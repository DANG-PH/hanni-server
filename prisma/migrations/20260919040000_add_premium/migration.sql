-- CreateEnum
CREATE TYPE "PaymentOrderKind" AS ENUM ('TOPUP', 'PREMIUM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "premiumUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentOrder"
  ADD COLUMN "kind" "PaymentOrderKind" NOT NULL DEFAULT 'TOPUP',
  ADD COLUMN "premiumPlanKey" TEXT;
