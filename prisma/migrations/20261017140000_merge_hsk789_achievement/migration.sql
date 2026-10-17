-- Từ vựng cấp 7–9 nằm chung ở cấp 7 (đại cương chỉ tách "7-9"), nên huy hiệu "Hoàn thành HSK 8"
-- và "HSK 9" không bao giờ đạt được (trang huy hiệu hiện "0/8", "0/9"). Gộp thành 1 huy hiệu 7–9.
DELETE FROM "Achievement" WHERE "code" IN ('HSK8_COMPLETE', 'HSK9_COMPLETE');

UPDATE "Achievement"
SET "nameVi" = 'Hoàn thành HSK 7–9', "descriptionVi" = 'Thuộc toàn bộ từ vựng cấp HSK 7–9'
WHERE "code" = 'HSK7_COMPLETE';
