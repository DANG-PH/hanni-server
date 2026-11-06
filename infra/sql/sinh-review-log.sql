-- Sinh dữ liệu GIẢ cho bảng ReviewLog trong lab để đo phân mảnh: rải đều 12 tháng gần nhất trên các tài khoản loadtest.
-- Không chạy trên production. Chặn sẵn: chỉ chạy được khi CSDL có tài khoản loadtest và không có tài khoản thật nào khác.
-- Đổi số dòng bằng biến so_dong:  psql -v so_dong=1000000 -f sinh-review-log.sql
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE email NOT LIKE '%@example.test') THEN
    RAISE EXCEPTION 'CSDL này có tài khoản không phải dữ liệu giả, dừng lại';
  END IF;
END $$;

-- Mỗi tài khoản 30 từ đang học.
INSERT INTO "UserWordProgress" ("userId", "wordId", "hskLevel")
SELECT u.id, w.id, w."hskLevel"
FROM "User" u
CROSS JOIN LATERAL (SELECT id, "hskLevel" FROM "Word" ORDER BY "frequencyRank" NULLS LAST LIMIT 30) w
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE tien_do AS
SELECT row_number() OVER () AS so, id, "userId", "wordId" FROM "UserWordProgress";

INSERT INTO "ReviewLog" ("userId", "wordId", "progressId", "rating", "reviewType", "reviewedAt",
                         "stateBefore", "stateAfter", "intervalBefore", "intervalAfter")
SELECT p."userId", p."wordId", p.id,
       (ARRAY['AGAIN', 'HARD', 'GOOD', 'EASY'])[1 + (i % 4)]::"ReviewRating",
       (ARRAY['LEARN', 'REVIEW'])[1 + (i % 2)]::"ReviewType",
       now() AT TIME ZONE 'UTC' - (random() * interval '365 days'),
       'REVIEW'::"SrsState", 'REVIEW'::"SrsState", 1, 2
FROM generate_series(1, :so_dong) AS i
JOIN tien_do p ON p.so = 1 + (i % (SELECT count(*) FROM tien_do));

ANALYZE "ReviewLog";
SELECT count(*) AS so_dong, pg_size_pretty(pg_total_relation_size('"ReviewLog"')) AS dung_luong FROM "ReviewLog";
