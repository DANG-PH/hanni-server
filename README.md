# hanni-server

REST API cho **Hanni** — web app học tiếng Trung theo chuẩn **HSK 3.0** (9 cấp).

NestJS 11 · Prisma 6 · PostgreSQL · Redis.

## Chạy local

```bash
cp .env.example .env          # điền secret; giá trị Google có thể để mẫu
docker compose up -d          # Postgres (cổng 2222) + Redis (cổng 2223)
npm install
npm run prisma:generate
npm run prisma:migrate        # tạo schema
npm run db:seed               # nạp 9 cấp HSK + huy hiệu + từ vựng mẫu (data/processed/words.seed.json)
npm run start:dev
```

- API: `http://localhost:8000/api`
- Swagger (dev): `http://localhost:8000/api/docs`
- Health: `GET /api/health`

## Cấu trúc

```
src/
├── config/            env.validation.ts (zod) — kiểm tra biến môi trường khi khởi động
├── infra/
│   ├── prisma/        PrismaService (global) — 1 điểm sở hữu kết nối DB
│   └── redis/         RedisService (global) — state OAuth, cache
├── common/            decorators, filters, DTO phân trang, time.util (timezone/streak)
├── events/            tên + payload sự kiện nội bộ (@nestjs/event-emitter)
├── modules/
│   ├── auth/          email+mật khẩu, Google OAuth2 (manual code flow), JWT cookie + refresh xoay vòng
│   ├── users/         hồ sơ, cài đặt học, mục tiêu ngày
│   ├── mail/          gửi mail xác minh/reset (dev: log console)
│   ├── vocabulary/    Word + HskLevel (đọc)
│   ├── srs/           SchedulerRegistry → Sm2Scheduler | FsrsScheduler, ReviewService, StudySession
│   ├── progress/      tiến độ theo cấp (bucket đã thuộc / đang học / sắp quên), cache UserLevelProgress
│   └── gamification/  streak (timezone-aware), achievements (rule engine), quiz trắc nghiệm
└── health/
prisma/
├── schema.prisma      lược đồ đầy đủ (9 cấp HSK ngay từ đầu)
└── seed/              hsk-levels · achievements · words
scripts/import/        ETL gộp nguồn mở → data/processed/words.seed.json (xem README trong đó)
data/
├── NOTICES.md         ghi công nguồn dữ liệu (bắt buộc hiển thị ở /nguon-du-lieu)
└── processed/words.seed.json   dataset mẫu (HSK 1) — CC BY-SA 4.0
```

## Quyết định kỹ thuật đã chốt

- **Phân cấp HSK**: theo **đại cương chính thức 11/2025** (300/500/1000/2000/3600/5400/~11000 luỹ kế).
  `HskLevel` lưu cả chỉ tiêu bản nháp 2021 để đối chiếu.
- **SRS**: ra mắt bằng **SM-2** (kiểu Anki); **FSRS** (ts-fsrs) đã cắm sẵn, đổi qua
  `UserSettings.srsScheduler` không cần migration (`UserWordProgress` chứa superset trường).
- **Auth**: cookie **HttpOnly** (`hanni_access` + `hanni_refresh`), refresh token **xoay vòng**
  + phát hiện reuse theo `familyId`. Google OAuth2 authorization-code flow tự viết, state lưu Redis.
- **Nghĩa tiếng Việt**: seed từ CVDICT (CC BY-SA 4.0) → `translationStatus=MACHINE`,
  review dần (HSK 1–3 trước). Dataset tổng hợp phát hành theo **CC BY-SA 4.0**.
- **Repo tách đôi**: `hanni-server` (đây) + `hanni-client` (Next.js).

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run start:dev` | dev server (watch) |
| `npm run build` | build production (`dist/`) |
| `npm run prisma:migrate` | tạo/áp migration (dev) |
| `npm run db:seed` | seed dữ liệu tĩnh |
| `npm run data:build-words` | chạy ETL gộp nguồn từ vựng (cần file trong `data/raw/`) |
| `npm test` | unit test |
| `npm run test:e2e` | smoke test (cần Postgres + Redis) |
