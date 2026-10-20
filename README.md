# hanni-server

REST API cho **Hanni** — web học tiếng Trung theo chuẩn **HSK 3.0** cho người Việt.

NestJS 11 · **TypeORM** 0.3 · PostgreSQL 16 · Redis · Gemini (AI).

## Chạy local

```bash
cp .env.example .env          # điền secret; GEMINI_API_KEY bỏ trống = tắt các tính năng AI
docker compose up -d          # Postgres (cổng 2222) + Redis (cổng 2223)
npm install
npm run db:migrate            # tạo bảng (src/database/migrations)
npm run db:seed               # 9 cấp HSK, huy hiệu, 10.958 từ, 749 bài, câu ví dụ, ngữ pháp, video
                              #   (SEED_SKIP_VIDEOS=true để bỏ video — phải tải phụ đề từ YouTube)
npm run start:dev
```

- API: `http://localhost:8000/api` · Swagger: `/api/docs` · Health: `GET /api/health`

## Đọc mã nguồn theo thứ tự này

1. **`src/main.ts`** → **`src/app.module.ts`**: khởi động Nest, gắn các module.
2. **`src/database/`** — toàn bộ phần dữ liệu ở một chỗ:
   - `entities/` — mỗi file 1 bảng (`word.entity.ts` = bảng `Word`), có chú thích tiếng Việt từng cột.
   - `enums.ts` — các kiểu liệt kê (`SrsState`, `ReviewRating`…), dùng được cả làm giá trị lẫn kiểu.
   - `database.config.ts` — kết nối Postgres (giờ UTC, `null` trong where = `IS NULL`).
   - `migrations/` — thay đổi lược đồ theo thời gian; `migrate.ts` chạy chúng.
   - `seed/` — dữ liệu tĩnh cho DB mới; `repository.util.ts` — vài hàm dùng chung
     (`findOrCreate`, `insertIfAbsent`, `insertAndReturn`, `likeEscape`).
3. **`src/modules/<tính năng>/`** — mỗi tính năng 1 thư mục cùng khuôn:
   `*.controller.ts` (route + kiểm tra quyền) → `*.service.ts` (nghiệp vụ, đọc/ghi DB qua
   `@InjectRepository(Entity)`) → `dto/` (kiểm tra dữ liệu gửi lên bằng class-validator).
   Hàm thuần không đụng DB tách ra `*.util.ts` và có `*.spec.ts` đi kèm.
4. **`src/common/`** — decorator (`@Public`, `@OptionalAuth`, `@CurrentUser`), bộ bắt lỗi chung, giờ/ngày học.

## Các module

| Thư mục | Làm gì |
|---|---|
| `auth` | Đăng ký/đăng nhập email + Google, JWT trong cookie, refresh token xoay vòng |
| `users` | Hồ sơ, cài đặt học, hồ sơ công khai, xoá tài khoản |
| `learn` | Lộ trình theo cấp, bài học, **phiên học bài** (giới thiệu từ → luyện → điền câu), kiểm tra trình độ |
| `srs` | Ôn tập ngắt quãng: hàng đợi, chấm thẻ (SM-2 / FSRS ở `scheduler/`), ẩn từ đã biết, từ khó nhớ |
| `vocabulary` | Từ điển: tra có xếp hạng, trang từ, Hán tự, câu ví dụ, "từ bạn đã biết sẵn" |
| `hanviet` | Quy luật âm Hán Việt → thanh điệu tiếng Trung |
| `pinyin` | Bảng phiên âm (âm tiết + ghi âm thật) |
| `grammar` | 389 điểm ngữ pháp, gợi ý ngữ pháp theo bài |
| `mock-exams` | Đề thi thử HSK 1–3 đúng cấu trúc (`papers/`), chấm + chữa bài, luyện từng dạng |
| `progress` | Tiến độ theo cấp, cache tiến độ bài/cấp |
| `insights` | Báo cáo tuần/tháng/quý + Hanni Coach (AI, Premium) |
| `gamification` | Chuỗi ngày học (`streak`), huy hiệu (`achievements`), quiz |
| `quests` · `leaderboard` | Nhiệm vụ ngày (xong cả 3 → 1 lá chắn giữ chuỗi) · bảng xếp hạng + giải đấu tuần |
| `minigame` | 4 trò chơi luyện từ, tính điểm + bảng xếp hạng (khách chơi được) |
| `shop` · `premium` · `payments` | Danh hiệu theo huy hiệu · gói Premium · thanh toán payOS |
| `videos` | Học qua video: phụ đề song ngữ, bấm từ để tra |
| `assistant` · `roleplay` · `ai-tools` · `scan` | Trợ lý AI (RAG) · luyện nói nhập vai · mẹo nhớ/chấm câu/bài đọc AI · quét ảnh |
| `classrooms` · `partners` | Lớp học cho giáo viên · form liên hệ hợp tác |
| `onboarding` | Khảo sát đầu vào → lộ trình đề xuất |
| `practice` | Lưu kết quả luyện nghe/phát âm |
| `notifications` · `push` · `mail` | Thông báo trong app (huy hiệu, bài giao, kết quả giải đấu, lá chắn) qua WebSocket + push · Web Push + nhắc học theo giờ · email |
| `referrals` | Mời bạn bè (cả hai nhận lá chắn giữ chuỗi) |

## Mẫu truy vấn hay gặp (TypeORM)

```ts
// đọc
this.words.findOneBy({ id });
this.words.find({ where: { hskLevel: 1, meaningVi: Not(IsNull()) }, order: { frequencyRank: 'ASC' }, take: 20 });
// thống kê → QueryBuilder
this.words.createQueryBuilder('word').select('word.hskLevel', 'hskLevel')
  .addSelect('COUNT(*)::int', 'count').groupBy('word.hskLevel').getRawMany();
// ghi
this.progress.update({ userId, wordId }, { isSuspended: true });
await insertIfAbsent(this.claims, { userId, localDate, questKey, xu: 0 }); // chỉ làm 1 lần, an toàn khi 2 request cùng lúc
this.dataSource.transaction(async (db) => { await db.insert(ReviewLog, {...}); ... });
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run start:dev` | chạy dev (tự nạp lại) |
| `npm run build` | build production (`dist/`) |
| `npm run db:migrate` | chạy migration chưa chạy |
| `npm run db:migration:generate -- src/database/migrations/TenMigration` | sinh migration từ thay đổi entity |
| `npm run db:seed` | nạp dữ liệu tĩnh (chạy lại an toàn) |
| `npm run data:build-words` | ETL gộp nguồn mở → `data/processed/words.seed.json` |
| `npm test` | unit test |
| `npm run test:e2e` | smoke test (cần Postgres + Redis) |

Deploy: xem `docs/deploy.md`. Ghi chú thiết kế chi tiết từng tính năng: `CLAUDE.md`.
