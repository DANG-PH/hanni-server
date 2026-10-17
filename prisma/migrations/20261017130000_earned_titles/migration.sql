-- Bỏ khung avatar và danh hiệu mua bằng xu (2026-10-17): danh hiệu giờ mở theo huy hiệu
-- đã đạt (title-catalog.ts), khung chỉ còn Phượng Hoàng của Premium (frame-catalog.ts).
-- Hoàn lại xu cho mọi món đã mua, đúng giá lúc bán.

CREATE TEMP TABLE "refund_items" AS
SELECT "userId",
  CASE "frameKey" WHEN 'jade' THEN 150 WHEN 'gold' THEN 300 WHEN 'crimson' THEN 500 WHEN 'dragon' THEN 800 ELSE 0 END AS "xu",
  'refund_frame:' || "frameKey" AS "reason"
FROM "UserFrame"
UNION ALL
SELECT "userId",
  CASE "titleKey" WHEN 'diligent' THEN 100 WHEN 'night_owl' THEN 100 WHEN 'bookworm' THEN 200
    WHEN 'rising_star' THEN 200 WHEN 'vocab_master' THEN 400 WHEN 'legend' THEN 800 ELSE 0 END,
  'refund_title:' || "titleKey"
FROM "UserTitle";

INSERT INTO "CoinTransaction" ("id", "userId", "amount", "reason", "createdAt")
SELECT gen_random_uuid(), "userId", "xu", "reason", now() FROM "refund_items" WHERE "xu" > 0;

INSERT INTO "UserWallet" ("userId", "balance", "updatedAt")
SELECT "userId", SUM("xu"), now() FROM "refund_items" WHERE "xu" > 0 GROUP BY "userId"
ON CONFLICT ("userId") DO UPDATE
  SET "balance" = "UserWallet"."balance" + EXCLUDED."balance", "updatedAt" = now();

DROP TABLE "refund_items";

-- Gỡ khung / danh hiệu đang dùng nhưng không còn hợp lệ.
UPDATE "UserSettings" SET "equippedFrame" = NULL
WHERE "equippedFrame" IS NOT NULL AND "equippedFrame" <> 'phoenix';

UPDATE "UserSettings" s SET "equippedTitle" = NULL
WHERE s."equippedTitle" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "UserAchievement" ua
  JOIN "Achievement" a ON a."id" = ua."achievementId"
  WHERE ua."userId" = s."userId" AND a."code" = CASE s."equippedTitle"
    WHEN 'rookie' THEN 'STREAK_1' WHEN 'diligent' THEN 'STREAK_7' WHEN 'persistent' THEN 'STREAK_30'
    WHEN 'legend' THEN 'STREAK_100' WHEN 'bookworm' THEN 'REVIEWS_200' WHEN 'rising_star' THEN 'WORDS_100'
    WHEN 'vocab_master' THEN 'WORDS_1000' WHEN 'hsk1_graduate' THEN 'HSK1_COMPLETE'
    WHEN 'hsk3_graduate' THEN 'HSK3_COMPLETE' END
);

-- DropForeignKey
ALTER TABLE "UserFrame" DROP CONSTRAINT "UserFrame_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserTitle" DROP CONSTRAINT "UserTitle_userId_fkey";

-- DropTable
DROP TABLE "UserFrame";

-- DropTable
DROP TABLE "UserTitle";
