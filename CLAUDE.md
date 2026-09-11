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
(streak/achievements/quiz), learn (731 bài), videos (học qua video), grammar (40 điểm HSK 1–3 có giải thích + 349 mục HSK 4–9 theo đại cương),
exams (lịch sử kiểm tra), leaderboard (xếp theo từ đã thuộc), push (thông báo đẩy Web Push, VAPID), health, Swagger.
Seed đầy đủ để deploy: 9 cấp HSK · huy hiệu · 10.9k từ (`data/processed/words.seed.json`) ·
731 bài · 40 điểm ngữ pháp HSK 1–3 + 349 mục HSK 4–9 (đại cương, prisma/seed/data/grammar-syllabus.raw.json) · 8 video (`prisma/seed/vi-cache.json` cache bản dịch máy) ·
**`assets/audio/` ~58MB đã commit** (đừng gitignore lại — deploy VPS cần).

**Học qua video**: `POST /videos` chỉ cần youtubeUrl (transcript tuỳ chọn) → tự lấy phụ đề CC
tiếng Trung từ YouTube + dịch máy NỀN (`translate.util.ts`: Google free → MyMemory, bảng
thuật ngữ tu tiên, cache). Không cần API key. `MYMEMORY_EMAIL` nâng hạn mức ngày.

Chưa làm (roadmap, chừa chỗ): câu ví dụ cho từ vựng, ngữ pháp HSK 4–9, cấu trúc đề thi HSK
thật (nghe/đọc/tính giờ), RAG chatbot, minigame, social/bạn bè.
