-- Chia ReviewLog theo tháng (DDIA ch. 6: phân mảnh theo khoảng thời gian).
-- Vì sao chọn bảng này: chỉ thêm, không sửa, lớn nhanh nhất, truy vấn nặng đều lọc theo thời gian (điểm giải đấu tuần,
-- báo cáo tuần/tháng). Dữ liệu cũ bỏ đi chỉ cần DROP 1 phần, không phải DELETE hàng triệu dòng.
-- Đánh đổi: khoá chính phải chứa reviewedAt, và truy vấn KHÔNG lọc theo thời gian sẽ phải quét mọi phần.
-- App không phải sửa gì: vẫn đọc ghi bảng "ReviewLog" như cũ.
\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE "ReviewLog" RENAME TO "ReviewLog_cu";
ALTER TABLE "ReviewLog_cu" RENAME CONSTRAINT "ReviewLog_pkey" TO "ReviewLog_cu_pkey";
ALTER TABLE "ReviewLog_cu" RENAME CONSTRAINT "ReviewLog_userId_fkey" TO "ReviewLog_cu_userId_fkey";
ALTER TABLE "ReviewLog_cu" RENAME CONSTRAINT "ReviewLog_progressId_fkey" TO "ReviewLog_cu_progressId_fkey";
ALTER INDEX "ReviewLog_progressId_idx" RENAME TO "ReviewLog_cu_progressId_idx";
ALTER INDEX "ReviewLog_userId_reviewedAt_idx" RENAME TO "ReviewLog_cu_userId_reviewedAt_idx";
ALTER INDEX "ReviewLog_wordId_idx" RENAME TO "ReviewLog_cu_wordId_idx";

CREATE TABLE "ReviewLog" (LIKE "ReviewLog_cu" INCLUDING DEFAULTS) PARTITION BY RANGE ("reviewedAt");

DO $$
DECLARE
  dau date := date_trunc('month', COALESCE((SELECT min("reviewedAt") FROM "ReviewLog_cu"), now()));
  cuoi date := date_trunc('month', now()) + interval '3 months';
  thang date := dau;
BEGIN
  WHILE thang <= cuoi LOOP
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF "ReviewLog" FOR VALUES FROM (%L) TO (%L)',
      'ReviewLog_' || to_char(thang, 'YYYY_MM'), thang, thang + interval '1 month'
    );
    thang := thang + interval '1 month';
  END LOOP;
END $$;

-- Quên tạo phần cho tháng mới thì dòng rơi vào đây thay vì làm hỏng lượt ôn của người học.
CREATE TABLE "ReviewLog_khac" PARTITION OF "ReviewLog" DEFAULT;

INSERT INTO "ReviewLog" SELECT * FROM "ReviewLog_cu";

ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id", "reviewedAt");
CREATE INDEX "ReviewLog_progressId_idx" ON "ReviewLog" ("progressId");
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog" ("userId", "reviewedAt");
CREATE INDEX "ReviewLog_wordId_idx" ON "ReviewLog" ("wordId");
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_progressId_fkey"
  FOREIGN KEY ("progressId") REFERENCES "UserWordProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

ANALYZE "ReviewLog";
