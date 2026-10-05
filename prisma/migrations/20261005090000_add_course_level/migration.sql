-- Cấp HSK người học chọn theo (lộ trình chính). NULL = suy từ tiến độ như cũ.
ALTER TABLE "UserSettings" ADD COLUMN "courseLevel" INTEGER;
