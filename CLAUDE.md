# hanni-server — NestJS

API học tiếng Trung theo chuẩn **HSK 3.0** (9 cấp). Xem `README.md` cho tổng quan.

## Stack
- NestJS 11 + TypeScript (CommonJS, `module: nodenext`)
- PostgreSQL qua **Prisma 6** (`prisma/schema.prisma`)
- Redis (ioredis) — state OAuth, cache
- `@nestjs/event-emitter` (in-process) cho luồng sự kiện; handler phải **idempotent**

## Cấu trúc thư mục
```
src/
├── config/        env.validation.ts — zod, chạy lúc khởi động
├── infra/         prisma/  redis/   (đều @Global)
├── common/        decorators (CurrentUser, Public, Roles), filters, time.util
├── events/        events.ts — hằng tên + kiểu payload
├── modules/<domain>/   auth · users · mail · vocabulary · srs · progress · gamification
│                        · learn · videos · grammar · exams · leaderboard
└── health/
prisma/  schema.prisma + seed/ (hsk-levels, achievements, words)
scripts/import/  ETL nguồn mở → data/processed/words.seed.json
```

## Convention
- Mỗi domain = 1 module NestJS (controller / service / module / dto). Business logic ở service.
- Validate input bằng `class-validator` trên DTO. `ValidationPipe` bật `whitelist` + `transform` toàn cục.
- Guard mặc định toàn app là `JwtAuthGuard`; route công khai gắn `@Public()`.
- Đọc token từ cookie `hanni_access` (fallback `Authorization: Bearer`).
- Không hardcode connection string — đọc qua `ConfigService` (đã validate bằng zod).
- Tên biến/hàm/log: tiếng Việt cho comment và message hướng người dùng; code identifier tiếng Anh.
- Prisma: bắt `PrismaClientKnownRequestError` (P2002/P2025) — đã có `AllExceptionsFilter` map sẵn.

## Điểm quan trọng
- **Phân cấp HSK dùng số bản 11/2025** (không phải bản nháp 2021). `HskLevel` giữ cả 2 bộ số.
- **SRS**: `SchedulerRegistry.get(name)` chọn `Sm2Scheduler` | `FsrsScheduler` theo
  `UserSettings.srsScheduler`. `UserWordProgress` có cả trường SM-2 (easeFactor/intervalDays)
  lẫn FSRS (stability/difficulty) → đổi thuật toán không cần migration.
- **Streak** tính theo **timezone IANA của user** + giờ cắt ngày `STREAK_DAY_CUTOFF_HOUR`,
  cập nhật **lười** (xem `StreakService`). Không dùng cron reset.
- **Index quan trọng cho queue SRS**: `UserWordProgress (userId, dueAt)` và `(userId, hskLevel, dueAt)`.
- **Push (`src/modules/push`)**: dùng `web-push` + khóa VAPID (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`
  trong env, sinh bằng `npx web-push generate-vapid-keys`). Để trống 2 khóa thì API trả 503 rõ ràng,
  không chặn app khởi động. `PushSubscription` xoá tự động khi gửi gặp lỗi 404/410 (thiết bị đã gỡ
  đăng ký). Chỉ có gửi thủ công (`POST /push/test`) — CHƯA có scheduler nhắc học tự động.

## Lệnh
`npm run start:dev` · `npm run build` · `npm run prisma:migrate` · `npm run db:seed` ·
`npm run data:build-words` · `npm test` · `npm run test:e2e`

## Trạng thái hiện tại
Core đã dựng: auth (email + Google), vocabulary, SRS (SM-2 + FSRS), progress, gamification
(streak/achievements/quiz), learn (738 bài — HSK1 đã có chủ đề thật, xem bên dưới), videos
(học qua video), grammar (40 điểm HSK 1–3 + 195 điểm HSK 4–9 có giải thích thật, xem bên
dưới), exams (lịch sử kiểm tra), leaderboard (xếp theo từ đã thuộc), push (thông báo đẩy Web
Push, VAPID), health, Swagger.
Seed đầy đủ để deploy: 9 cấp HSK · huy hiệu · 10.9k từ (`data/processed/words.seed.json`) ·
738 bài (HSK1: 27 bài theo chủ đề, các cấp còn lại chia đều 15 từ/bài theo tần suất) · 40 điểm
ngữ pháp HSK 1–3 + 349 mục HSK 4–9 (đại cương, prisma/seed/data/grammar-syllabus.raw.json,
195/349 mục đã có giải thích thật) · ~42 video (`prisma/seed/vi-cache.json` cache bản dịch máy) ·
**`assets/audio/` ~58MB đã commit** (đừng gitignore lại — deploy VPS cần).

**Bài học theo chủ đề (`/learn`)**: cấp nào có file
`data/curated/lesson-themes-hsk{level}.json` (mapping mỗi từ → 1 trong N chủ đề soạn tay,
xem `themeOrder`/`themeNames`) thì `scripts/import/build-words.ts` nhóm từ theo CHỦ ĐỀ trước
(vẫn sắp theo tần suất trong mỗi chủ đề), chủ đề dài hơn `MAX_THEME_LESSON` (16 từ) tự tách
"(1/2)", "(2/2)"...; cấp chưa có file giữ cách chia đều 15 từ/bài cũ (`lessons.ts` tự đặt
"Bài N"). Hiện chỉ HSK1 (300/300 từ, 15 chủ đề, 27 bài) đã làm — HSK2/3 và cao hơn vẫn chia
đều, chưa có chủ đề. Đổi chủ đề cho DB ĐÃ seed sẵn (không xoá/tạo lại Word) thì chạy
`npx tsx scripts/migrate-hsk1-lesson-themes.ts` — chỉ cập nhật `Word.lessonId/lessonOrder` +
upsert `Lesson.title`, không đụng `UserWordProgress` nên tiến độ người dùng không mất.

**Học qua video**: `POST /videos` chỉ cần youtubeUrl (transcript tuỳ chọn) → tự lấy phụ đề CC
tiếng Trung từ YouTube + dịch máy NỀN (`translate.util.ts`: Google free → MyMemory, bảng
thuật ngữ tu tiên, cache). Không cần API key. `MYMEMORY_EMAIL` nâng hạn mức ngày.
`youtube-transcript.util.ts` có timeout 20s/ngôn ngữ (tránh treo vô thời hạn nếu 1 video lỗi).

**Ngữ pháp HSK 4–9**: 349 mục từ đại cương chính thức, chia 2 loại —
(1) mẫu câu/cấu trúc thật (句子的类型/句子成分/固定格式/特殊表达法/语段) → đã soạn giải thích +
ví dụ tay trong `prisma/seed/grammar-explained-hsk{4,5,6,7}.ts` (63+38+24+70 = 195 mục, khớp
`content` nguyên văn với raw.json — LUÔN chạy lại script verify key trước khi sửa, xem cách làm
trong các file đó); (2) danh sách từ vựng theo từ loại (词类/短语) → giữ dạng rút gọn, không cần
giải thích riêng từng mục. Field `flat` (tính trong grammar.service.ts) tự bật/tắt theo
`explanationVi` có rỗng hay không — không cần sửa gì ở FE khi thêm giải thích mới.

**Quiz** (`src/modules/gamification/quiz/quiz.service.ts`): `generate()` trộn 2 dạng câu —
`listening` (~`LISTENING_RATIO` 40% số câu, chỉ lấy từ có `audioUrl`, xếp trước) và `reading`
(còn lại) — mô phỏng thứ tự nghe-trước-đọc-sau của đề thi thật. Field `mode`/`audioUrl` trả về
theo từng câu, client tự quyết định ẩn/hiện Hán tự.

Chưa làm (roadmap, chừa chỗ): câu ví dụ cho từ vựng, cấu trúc đề thi HSK
thật đầy đủ (nhiều phần nghe/đọc/viết đúng số câu + thời gian từng cấp — hiện mới có câu
nghe/đọc trộn vào quiz từ vựng, chưa đúng cấu trúc thật), RAG chatbot, minigame, social/bạn bè.
