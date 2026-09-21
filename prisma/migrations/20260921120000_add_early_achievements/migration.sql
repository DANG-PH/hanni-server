-- Huy hiệu MỐC SỚM — người mới phải nhận được phần thưởng đầu tiên ngay trong
-- phiên học đầu, thay vì phải chờ streak 7 ngày / 50 từ "đã thuộc" (mà "đã
-- thuộc" cần interval SRS >= 21 ngày, nên trước đây mốc thấp nhất là bất khả
-- thi trong 3 tuần đầu). Đo thật trên production: 0/102 user từng mở khoá
-- huy hiệu nào, streak dài nhất trong lịch sử app chỉ 3 ngày.
--
-- INSERT ở migration (không phải seed script) để tự áp dụng qua CI/CD
-- `prisma migrate deploy` — seed KHÔNG chạy trong pipeline deploy.
-- Idempotent nhờ ON CONFLICT: chạy lại vô hại, và DB seed mới cũng không bị
-- trùng vì seed dùng upsert theo cùng `code`.
INSERT INTO "Achievement" (id, code, "nameVi", "descriptionVi", category, threshold)
VALUES
  (gen_random_uuid(), 'REVIEWS_1', 'Bước đầu tiên', 'Ôn từ vựng đầu tiên của bạn', 'MILESTONE', 1),
  (gen_random_uuid(), 'REVIEWS_10', 'Khởi động', 'Hoàn thành 10 lượt ôn từ vựng', 'MILESTONE', 10),
  (gen_random_uuid(), 'REVIEWS_50', 'Vào nhịp', 'Hoàn thành 50 lượt ôn từ vựng', 'MILESTONE', 50),
  (gen_random_uuid(), 'REVIEWS_200', 'Bền bỉ', 'Hoàn thành 200 lượt ôn từ vựng', 'MILESTONE', 200),
  (gen_random_uuid(), 'STREAK_1', 'Ngày đầu tiên', 'Hoàn thành ngày học đầu tiên', 'STREAK', 1),
  (gen_random_uuid(), 'STREAK_3', 'Chuỗi 3 ngày', 'Học liên tục 3 ngày', 'STREAK', 3),
  (gen_random_uuid(), 'WORDS_10', 'Thuộc 10 từ', 'Đưa 10 từ vào trạng thái đã thuộc', 'VOLUME', 10),
  (gen_random_uuid(), 'WORDS_25', 'Thuộc 25 từ', 'Đưa 25 từ vào trạng thái đã thuộc', 'VOLUME', 25)
ON CONFLICT (code) DO NOTHING;
