# hanni-server — NestJS

API học tiếng Trung theo chuẩn **HSK 3.0** (9 cấp). Xem `README.md` cho tổng quan.

## Stack
- NestJS 11 + TypeScript (CommonJS, `module: nodenext`)
- PostgreSQL qua **Prisma 6** (`prisma/schema.prisma`)
- Redis (ioredis) — state OAuth, cache, và Redis adapter cho WebSocket (`RedisIoAdapter`,
  `src/infra/redis/redis-io.adapter.ts`) — sẵn sàng scale nhiều instance
- `@nestjs/event-emitter` (in-process) cho luồng sự kiện; handler phải **idempotent**
- `@nestjs/websockets` + `socket.io` (namespace `/notifications`) — đẩy thông báo realtime VÀ
  tin nhắn trực tiếp (dùng chung 1 gateway, khác event name — xem mục Nhắn tin bên dưới)
- `@google/genai` (Gemini) — trợ lý AI RAG, để trống `GEMINI_API_KEY` thì tự tắt (báo rõ, không crash)

## Cấu trúc thư mục
```
src/
├── config/        env.validation.ts — zod, chạy lúc khởi động
├── infra/         prisma/  redis/   (đều @Global)
├── common/        decorators (CurrentUser, Public, Roles), filters, time.util
├── events/        events.ts — hằng tên + kiểu payload
├── modules/<domain>/   auth · users (+ users/follows) · mail · vocabulary · srs · progress
│                        · gamification · learn · videos (+ videos/comments, videos/likes)
│                        · grammar · exams · leaderboard · push · notifications (WebSocket gateway)
│                        · practice (lưu kết quả luyện nghe/phát âm) · onboarding (khảo sát đầu vào)
│                        · assistant (trợ lý AI RAG, Gemini)
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
- **Mail (`src/modules/mail`)**: `MailService` gửi SMTP thật qua `nodemailer` khi có
  `MAIL_HOST` (dùng `MAIL_PORT`/`MAIL_USER`/`MAIL_PASSWORD`/`MAIL_FROM`) — để trống `MAIL_HOST`
  thì chỉ log ra console (dev). Lỗi gửi mail chỉ log, KHÔNG throw, để giữ đúng bảo mật của
  `forgotPassword()` (luôn trả lời như nhau dù email có tồn tại hay không) và tránh 500 vì SMTP
  trục trặc. Trước đây dù điền `MAIL_HOST` vẫn chỉ log suông (chưa từng gọi SMTP thật) — nghĩa
  là xác minh email/đặt lại mật khẩu quên KHÔNG hoạt động được trên production cho tới khi sửa.
  **Email tổng kết tuần** (`WeeklyDigestService`, cùng cơ chế `@Cron(CronExpression.EVERY_HOUR)`
  như `ReminderService`): mỗi thứ Hai 9h sáng local (`DIGEST_HOUR`/`DIGEST_WEEKDAY`) gửi cho ai
  bật `UserSettings.weeklyDigestEnabled` (mặc định true, tắt được ở `/settings`) — tính số ngày
  đã học/từ đã ôn/từ mới đã thuộc trong 7 ngày gần nhất qua `UserDailyActivity` (mỗi dòng = 1
  ngày CÓ hoạt động) + streak hiện tại. Ai không học gì tuần đó vẫn nhận được email nhưng đổi
  sang bản "mời quay lại" thay vì bản tổng kết (`weeklyDigestHtml()` trong `templates.ts` tự đổi
  heading/CTA theo `daysStudied > 0`).
- **Phân cấp HSK dùng số bản 11/2025** (không phải bản nháp 2021). `HskLevel` giữ cả 2 bộ số.
- **Từ vựng hôm nay** (`GET /words/of-the-day`, route đăng ký TRƯỚC `words/:id` để tránh
  `ParseUUIDPipe` nuốt mất — xem `vocabulary.controller.ts`): 1 từ CỐ ĐỊNH theo ngày (đổi lúc 0h
  UTC), giống nhau cho mọi user, không lưu DB — xoay vòng theo `frequencyRank` (chỉ từ có nghĩa
  + có `frequencyRank`, tránh rơi vào từ hiếm) bằng `dayIndex % tổng số từ hợp lệ`.
- **SRS**: `SchedulerRegistry.get(name)` chọn `Sm2Scheduler` | `FsrsScheduler` theo
  `UserSettings.srsScheduler`. `UserWordProgress` có cả trường SM-2 (easeFactor/intervalDays)
  lẫn FSRS (stability/difficulty) → đổi thuật toán không cần migration.
  `ReviewService.getQueue()` chặn 2 tầng riêng: `newCardsPerDay` giới hạn từ MỚI mỗi ngày (bỏ
  qua khi học theo bài, `lessonId` — nạp cả bài luôn), `maxReviewsPerDay` (tuỳ chọn, null =
  không giới hạn) giới hạn số THẺ ÔN lấy ra mỗi lần gọi hàng đợi dựa trên `reviewsDoneToday` —
  `counts.due` vẫn trả tổng số thực sự đến hạn (không bị cắt) để FE biết còn tồn đọng bao nhiêu,
  chỉ có mảng `due` trả về là bị giới hạn. `maxReviewsPerDay` trước đây đã có sẵn trong
  schema/DTO nhưng chưa có logic nào dùng tới, cũng chưa có UI đặt được ở `/settings` — giống
  lỗi `reminderHour` từng gặp (field mồ côi cả 2 đầu, chỉ khác là field này còn thiếu cả phần
  áp dụng ở backend).
- **Streak** tính theo **timezone IANA của user** + giờ cắt ngày `STREAK_DAY_CUTOFF_HOUR`,
  cập nhật **lười** (xem `StreakService`). Không dùng cron reset. Có "lá chắn"
  (`UserStreak.streakFreezeCount`) giữ nguyên chuỗi nếu lỡ nghỉ ĐÚNG 1 ngày — thưởng 1 lá chắn
  mỗi mốc 7 ngày liên tục, tối đa 2 cái cùng lúc (`FREEZE_MILESTONE_DAYS`/`MAX_STREAK_FREEZE`
  trong `streak.service.ts`). `GET /streak/history?days=` (mặc định 30, `StreakService.history()`)
  trả về lịch sử `UserDailyActivity` — chỉ có bản ghi cho NGÀY CÓ hoạt động (không tự điền ngày
  nghỉ) — FE tự dựng đủ chuỗi ngày rồi khớp theo ISO date (`components/activity-calendar.tsx`).
- **Huy hiệu** (`GET /achievements`, `AchievementsService.list()`): mỗi mục trả kèm
  `progressCurrent`/`progressTarget` — streak hiện tại (nhóm STREAK), số từ đã thuộc (VOLUME),
  hoặc `learnedWords`/`totalWords` lấy từ `UserLevelProgress` (LEVEL — `threshold` ở nhóm này là
  SỐ CẤP HSK 1-9, không phải số từ, nên không dùng thẳng làm mẫu số).
- **Index quan trọng cho queue SRS**: `UserWordProgress (userId, dueAt)` và `(userId, hskLevel, dueAt)`.
- **Push (`src/modules/push`)**: dùng `web-push` + khóa VAPID (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`
  trong env, sinh bằng `npx web-push generate-vapid-keys`). Để trống 2 khóa thì API trả 503 rõ ràng,
  không chặn app khởi động. `PushSubscription` xoá tự động khi gửi gặp lỗi 404/410 (thiết bị đã gỡ
  đăng ký). Gửi thủ công qua `POST /push/test`, VÀ có **nhắc học tự động**
  (`ReminderService`, `@nestjs/schedule` — `ScheduleModule.forRoot()` ở `app.module.ts`):
  mỗi giờ (`@Cron(CronExpression.EVERY_HOUR)`) quét user có `UserSettings.reminderHour` khớp
  giờ địa phương hiện tại (`getLocalHour()` trong `time.util.ts`, theo `User.timezone`) VÀ có ít
  nhất 1 `PushSubscription`, bỏ qua ai đã đạt mục tiêu ngày hôm nay (`UserDailyActivity.goalMet`
  của ngày local — tính bằng `localStudyDate()`/`STREAK_DAY_CUTOFF_HOUR` giống `StreakService`)
  — tránh nhắc thừa khi đã học đủ. Chạy theo GIỜ (không phải phút) nên chỉ khớp đúng 1 lần/ngày
  cho hầu hết user, trừ số ít timezone lệch nửa giờ (vd Asia/Kathmandu) — chấp nhận được, một
  lời nhắc không cần chính xác tới phút. `PushService.sendToUser()` (tách riêng khỏi
  `sendTest()`) không throw nếu chưa bật/chưa có subscription, vì đây là job nền chạy cho nhiều
  user chứ không phải request của chính user đó. Riêng cảnh báo **"sắp mất chuỗi"**
  (`sendStreakRiskReminders()`, cùng file) chạy lúc `STREAK_RISK_HOUR` cố định (21h local, KHÔNG
  cho user tự chỉnh như `reminderHour`) cho ai có `currentStreak > 0` nhưng CHƯA có bản ghi
  `UserDailyActivity` nào hôm nay — điều kiện khác nhắc thường (`goalMet`) vì streak chỉ cần
  hoạt động ĐẦU TIÊN trong ngày là giữ được (`StreakService.recordActivity()`'s `wasNewDay`),
  không cần đạt đủ mục tiêu — cơ chế giữ chân người dùng kiểu Duolingo.
- **Bình luận + thích video + thông báo (`src/modules/videos/comments`, `.../likes`,
  `src/modules/notifications`)**: bình luận 1 cấp trả lời (trả lời của trả lời tự gộp vào bình
  luận gốc — xem `CommentsService.create`), thích video kiểu upsert (idempotent). Tạo bình
  luận/thích phát `AppEvent.CommentCreated` / `AppEvent.VideoLiked` (xem `src/events/events.ts`)
  → `NotificationsListener` tạo dòng `Notification` (bỏ qua nếu người gây ra chính là người
  nhận, xem `NotificationsService.create`) → đẩy realtime qua `NotificationsGateway`
  (Socket.IO, namespace `/notifications`, mỗi user 1 "room" `user:<id>`). Gateway xác thực bằng
  cách tự đọc + verify cookie `hanni_access` trong handshake (không qua `JwtAuthGuard` vì đó là
  guard HTTP) — cookie `SameSite=Lax` khiến origin lạ không gửi kèm được nên CORS gateway để
  `origin: true` (phản chiếu origin) vẫn an toàn. `main.ts` gắn tường minh
  `app.useWebSocketAdapter(new IoAdapter(app))`, chạy chung cổng HTTP (không cần cổng riêng,
  nhưng Nginx production phải proxy đúng header `Upgrade`/`Connection` cho path
  `/notifications/socket.io/`). 5 loại thông báo: `COMMENT_REPLY`, `VIDEO_COMMENT` (bình luận
  vào video mình thêm), `VIDEO_LIKE` (thích video mình thêm) — video hệ thống seed sẵn có
  `createdById = null` nên không phát 2 loại sau cho video đó —, `NEW_FOLLOWER` (xem dưới), và
  `ACHIEVEMENT_UNLOCKED` (mở khoá huy hiệu mới — KHÔNG có `actorId` vì tự đạt được, không phải
  do người khác tác động; `AchievementsService.unlock()` phát `AppEvent.AchievementUnlocked`
  chỉ khi thật sự unlock lần đầu, nhờ bắt lỗi unique constraint có sẵn).
- **Theo dõi (`src/modules/users/follows`, model `Follow`)**: 1 chiều (không cần theo dõi lại
  nhau), `POST`/`DELETE /users/:id/follow` kiểu upsert/delete idempotent giống thích video, tự
  chặn tự theo dõi chính mình (400). Phát `AppEvent.UserFollowed` → `NotificationsListener` tạo
  `NEW_FOLLOWER`. `LeaderboardService.top()` trả thêm `isFollowing` mỗi dòng (so với người đang
  gọi API) để FE hiện nút theo dõi ngay trong bảng xếp hạng. `GET /leaderboard` nhận
  thêm `scope=friends` (mặc định `global`) — lọc `rankedPairs()` còn (chính mình + người đang
  theo dõi) TRƯỚC khi tính hạng, cho FE làm thẻ "So với bạn bè" ở dashboard — theo dõi ai đó giờ
  có tác dụng cụ thể (so tiến độ) thay vì chỉ tăng follower count. **Tiêu chí thứ 5 — `elo`**
  (`rankedPairs()` đọc thẳng `UserRating`, `import computeTier from '../duel/duel-rank.util'`
  — import THẲNG hàm thuần, không qua DI, để tránh phải kéo cả `NotificationsModule` vào
  `LeaderboardModule` chỉ để dùng 1 phép tính tier): mỗi dòng trả kèm `tier`/`tierColor` (tính
  theo `rank` = vị trí trong mảng đã sắp, tôn trọng đúng luật top-100 Thách Đấu) để FE hiện huy
  hiệu rank ngay trong bảng xếp hạng chính, không chỉ ở `/minigame`.
- **Mời bạn bè (`src/modules/referrals`, model `Referral`)**: link mời là `/register?ref=<userId>`
  — không sinh mã riêng, dùng thẳng userId. `AuthService.register()` ghi 1 dòng `Referral`
  best-effort (lỗi không chặn đăng ký — link cũ/giả không được để hỏng cả luồng đăng ký) nếu có
  `dto.ref` hợp lệ và khác chính user mới. Thưởng: `ReferralsListener` lắng `AppEvent.
  StreakUpdated`, chỉ thưởng khi `currentStreak === 1 && longestStreak === 1` (dấu hiệu ĐÂY LÀ
  streak đầu tiên trong đời tài khoản — longestStreak không giảm khi streak đứt, nên phân biệt
  được với "bắt đầu lại sau khi đứt chuỗi cũ") — cả người giới thiệu lẫn người được giới thiệu
  nhận +1 "lá chắn" streak qua `StreakService.grantFreeze()` (tách khỏi mốc 7-ngày tự động ở
  `advanceStreak()`, cùng chung mức trần `MAX_STREAK_FREEZE`, nay `export` để dùng chéo module).
  `GET /referrals/me` trả số liệu cho trang "Mời bạn bè".
- **Ví xu (`src/modules/wallet`, model `UserWallet` + `CoinTransaction`)**: soft currency —
  KHÔNG hoàn tiền, KHÔNG chuyển nhượng giữa user, KHÔNG quy đổi ngược lại tiền mặt, chỉ tiêu
  được trong chính các tính năng của Hanni (xem `FEATURES.md` mục đánh giá rủi ro). Mọi thay đổi
  số dư đi qua `WalletService.credit()`/`debit()` — LUÔN ghi kèm 1 dòng `CoinTransaction` để đối
  soát; `debit()` dùng `prisma.userWallet.updateMany({where: {balance: {gte: amount}}})` (atomic,
  có điều kiện) thay vì đọc-rồi-ghi, tránh ví âm khi nhiều request cùng lúc. Nguồn thu: minigame
  (xem dưới) + **điểm danh hằng ngày** (`WalletListener` lắng ĐÚNG `AppEvent.StreakUpdated` — sự
  kiện này chỉ phát khi có hoạt động NGÀY MỚI, khớp nghĩa "điểm danh" mà không cần dựng hệ theo
  dõi riêng) + **nạp tiền thật qua payOS** (`src/modules/payments`, xem dưới). Nơi tiêu đầu tiên
  (sink): `POST /wallet/buy/streak-freeze` (300 xu/lá chắn, chặn nếu đã đạt `MAX_STREAK_FREEZE`,
  kiểm tra TRƯỚC khi trừ xu để không mất xu oan nếu không mua được).
- **Nạp tiền thật (`src/modules/payments`, model `PaymentOrder`)**: Giai đoạn 5 minigame — dùng
  **payOS** (mô hình A2A qua VietQR/chuyển khoản, `@payos/node` SDK), KHÔNG dùng VNPay/MoMo vì
  payOS có gói MIỄN PHÍ không giới hạn giao dịch cho cá nhân/hộ kinh doanh (từ 01/2026, eKYC
  ngân hàng Kiên Long ~5 phút, không cần đăng ký doanh nghiệp đầy đủ) và tiền về THẲNG tài khoản
  ngân hàng (không qua ví trung gian giữ hộ) — đây là điểm khác biệt quan trọng so với lo ngại
  pháp lý ban đầu về "trung gian thanh toán": Hanni ở đây đóng vai người bán hàng hoá/dịch vụ số
  của CHÍNH MÌNH (bán xu để dùng trong app), không phải bên giữ/chuyển tiền hộ người khác. Tỷ
  giá 1 VNĐ = 1 xu (`VND_PER_XU`, đúng đề xuất gốc). `PaymentsService` tự vô hiệu hoá gọn gàng
  (`ServiceUnavailableException`) nếu thiếu `PAYOS_CLIENT_ID`/`PAYOS_API_KEY`/`PAYOS_CHECKSUM_KEY`
  — KHÔNG chặn app khởi động, giống hệt `GEMINI_API_KEY`/VAPID. `POST /payments/topup` tạo
  `PaymentOrder` (PENDING) + gọi payOS tạo payment link, trả `checkoutUrl` cho FE redirect thẳng
  sang (không tự dựng UI thanh toán). `orderCode` là cột `Int @unique @default(autoincrement())`
  RIÊNG (không phải `id` UUID) vì payOS yêu cầu mã đơn dạng số. `POST /payments/webhook/payos`
  (`@Public()`, payOS gọi trực tiếp không qua cookie đăng nhập) xác thực bằng
  `payos.webhooks.verify()` (HMAC-SHA256 với checksum key, SDK tự lo) rồi mới cộng xu — idempotent
  theo `status !== PENDING` vì payOS có thể gọi lại webhook nhiều lần cho cùng giao dịch, và so
  khớp lại `amount` với `PaymentOrder.amountVnd` trước khi cộng (không tin thẳng payload dù đã
  qua verify). **CHƯA thể test luồng thật** (chưa có tài khoản merchant payOS thật) — cần bạn tự
  đăng ký ở my.payos.vn, hoàn tất eKYC, lấy `clientId`/`apiKey`/`checksumKey` rồi điền vào
  `.env.production.local`, và khai báo webhook URL
  (`https://<domain>/api/payments/webhook/payos`) trong dashboard payOS.
- **Minigame "Dịch tốc độ" + "Nghe đoán từ" + "Ghép cặp" + "Chọn pinyin đúng"
  (`src/modules/minigame`, model `MinigameSession`)**: Giai đoạn 1 theo lộ trình 5 giai đoạn
  trong `FEATURES.md` — chơi 1 mình, tính giờ, bảng xếp hạng ngày/tuần RIÊNG theo từng mode (gộp
  chung sẽ không công bằng vì độ khó khác nhau). TRANSLATE/LISTENING/PINYIN dùng CHUNG engine
  trắc nghiệm — `MinigameService.start(userId, mode)`: `answerOf(w)` chọn đáp án đúng là
  `meaningVi` (TRANSLATE/LISTENING) hay `pinyin` (PINYIN); LISTENING lọc thêm `audioUrl:
  {not:null}`; server luôn trả đủ Hán tự + pinyin + audio cho MỌI mode, FE tự quyết định ẩn/hiện
  theo mode (LISTENING ẩn Hán tự/pinyin tự phát audio; PINYIN ẩn RIÊNG caption pinyin vì đó
  chính là đáp án đang cho chọn — y hệt cách `QuizService`/`quiz-runner.tsx` đã làm cho câu
  nghe). Khác `QuizService` (tin thẳng `isCorrect` client tự báo cáo) — ở đây `POST
  /minigame/start` LƯU SẴN đáp án đúng trong `MinigameSession.questions` (JSON, không trả
  `correctIndex` về client), `POST /minigame/:id/finish` tự so khớp `chosenIndex` với đáp án đã
  lưu — cần thiết vì kết quả game này quy đổi thành xu thật, không thể tin client tự báo điểm
  như quiz thường. Thưởng 1 xu/câu đúng.
  **"Ghép cặp" (MATCH)**: khác hẳn 2 mode trên — `startMatchGame()` chọn `MATCH_PAIRS` (8) từ,
  tạo 2 thẻ/từ (mặt Hán tự + mặt nghĩa, `MatchCard{cardId,wordId,kind,content}`), trộn vị trí rồi
  trả về NGUYÊN mảng thẻ CÓ `wordId` — không giấu được "đáp án" như `correctIndex` vì việc so
  khớp 2 thẻ vốn công khai ngay khi tải dữ liệu (bản chất trò lật thẻ trí nhớ, client tự biết 2
  thẻ nào khớp nhau ngay khi nhận response). `finishMatchGame()` vì vậy CHỈ chặn được gian dối lộ
  liễu nhất — `durationMs` phải ≥ `MATCH_PAIRS * MATCH_MIN_MS_PER_PAIR` (500ms/cặp) mới tính điểm,
  không xác minh được chi tiết từng lượt lật như MC. Điểm = `MATCH_PAIRS - mistakes` (tối thiểu
  1 nếu hợp lệ), `mistakes` (số lần lật sai) do client tự đếm và báo qua `FinishMinigameDto`.
- **Đấu 1v1 + rank tier + mùa giải (`src/modules/duel`, model `UserRating` + `DuelMatch` +
  `DuelSeason` + `DuelSeasonResult`)**: Giai đoạn 2+3 minigame — ghép trận + đấu realtime qua
  WebSocket, ELO thô (K=32, công thức chuẩn cờ vua), CHỈ có chế độ `TRANSLATE` (chưa ghép LISTENING
  vào đấu 1v1 — tách riêng hàng đợi theo mode sẽ làm hàng chờ lâu hơn nhiều khi lượng người chơi
  còn nhỏ, để dồn hết vào 1 hàng đợi duy nhất trước). Dùng CHUNG namespace `/notifications` — 3
  sự kiện `duel:join-queue`/`duel:leave-queue`/`duel:answer` thêm thẳng vào
  `NotificationsGateway` (không dựng gateway riêng, cùng lý do với tin nhắn/typing). `DuelService`
  giữ TOÀN BỘ trạng thái hàng đợi + trận đấu ĐANG DIỄN RA trong bộ nhớ (`Map`) — **CHỈ đúng khi
  chạy 1 instance**; RedisIoAdapter hiện chỉ lo phần chuyển tiếp WebSocket giữa các instance,
  CHƯA áp dụng cho hàng đợi/trạng thái trận — cần chuyển sang Redis nếu sau này thật sự scale
  ngang. Luật: 8 câu, sau khi ghép xong chờ `MATCH_INTRO_MS` (3s, cho FE hiện màn "VS") rồi mới
  bắn câu đầu, mỗi câu `ROUND_DURATION_MS` (8s) để cả 2 trả lời, ai đúng được 1 điểm (đúng cả 2
  thì cả 2 đều được — không cộng thêm vì nhanh hơn, đơn giản hoá cho giai đoạn kiểm chứng), vòng
  kết thúc SỚM nếu cả 2 đã trả lời chứ không cần đợi hết giờ (`submitAnswer()` tự huỷ timer).
  `NotificationsGateway` ↔ `DuelService` phụ thuộc vòng lẫn nhau (gateway gọi `DuelService` khi
  nhận sự kiện, `DuelService` gọi `gateway.emitToUser()` khi đẩy kết quả) — xử lý bằng
  `forwardRef()` cả 2 chiều; `DuelService` "sống" trong `NotificationsModule` (xem ghi chú trong
  `notifications.module.ts`) để tránh vòng lặp Ở CẤP MODULE, `DuelModule` chỉ import
  `NotificationsModule` một chiều cho phần REST.
  **Forfeit khi rớt mạng giữa trận**: `handleDisconnect()` gọi
  `DuelService.handlePlayerDisconnect()` — cho `DISCONNECT_FORFEIT_MS` (15s) để load lại
  trang/mạng chập chờn ngắn trước khi tự xử thua (`forfeitMatch()` → `finishMatch(matchId,
  forfeitedBy)`, ép `winnerId` về phía còn lại BẤT KỂ điểm số hiện tại, lưu vào cột
  `DuelMatch.forfeitedUserId`); `handleConnection()` gọi `handlePlayerReconnect()` huỷ timer nếu
  vào lại kịp. **Tự phục hồi UI khi refresh giữa trận**: `GET /duel/active`
  (`getActiveMatchState()`) trả trạng thái trận hiện tại của user (đối thủ, vòng, điểm, câu hỏi
  nếu đã bắt đầu) — FE gọi 1 lần lúc vào trang `/minigame` để biết có nên hiện lại đúng màn hình
  đấu thay vì màn "Tìm đối thủ" (round timer ở server không phụ thuộc việc client có đang xem).
  **Rank tier** (`duel-rank.util.ts`): 9 bậc tham khảo hệ Liên Minh Huyền Thoại (Sắt → Đồng →
  Bạc → Vàng → Bạch Kim → Kim Cương → Cao Thủ → Đại Cao Thủ → Thách Đấu) theo ngưỡng ELO, KHÔNG
  chia division (I-IV) vì lượng người chơi ban đầu còn nhỏ. **Thách Đấu bị GIỚI HẠN SỐ LƯỢNG**
  (`CHALLENGER_TOP_N = 100`, giống Challenger/Cao Thủ Vinh Danh ở game khác) — `computeTier(elo,
  rank)` mới là hàm tính tier THẬT dùng cho hiển thị/thưởng (đủ ELO Thách Đấu mà rank > 100 thì
  hạ xuống Đại Cao Thủ); `tierForElo(elo)` chỉ còn là phép tính ngưỡng thuần, dùng cho bảng chú
  giải chung (`GET /duel/rank-tiers`, trả `RANK_TIERS` + `challengerTopN`) chứ không dùng trực
  tiếp để gắn tier cho 1 user cụ thể nữa. `getMyRating()` chỉ query đếm rank (`UserRating.elo`
  có `@@index`) khi ELO đã chạm ngưỡng Thách Đấu — tránh query thừa cho đa số người chơi chưa
  gần ngưỡng đó. `GET /duel/rating/me` + `GET /duel/leaderboard` trả kèm `tier`/`tierColor` mỗi
  dòng. **Độ khó theo ELO** (`wordPoolSkipForElo()`): `generateQuestions()` tính ELO trung bình
  2 người trong trận rồi `skip` dần các từ THÔNG DỤNG NHẤT khi ELO cao hơn (cùng `take` =
  `POOL_SIZE`, chỉ dịch cửa sổ từ vựng sang từ hiếm/khó hơn) — rơi về pool dễ nhất (`skip=0`)
  nếu skip vượt quá tổng số từ hợp lệ. **Mùa giải** (`duel-season.service.ts`, `DuelSeasonService`): reset
  theo THÁNG DƯƠNG LỊCH (`currentSeasonKey()` = YYYYMM), `@Cron(EVERY_DAY_AT_1AM)` kiểm tra mỗi
  ngày nhưng chỉ THẬT SỰ rollover khi khoá tháng đổi (idempotent — gọi lại trong cùng tháng vô
  hại). Lúc rollover: chụp `DuelSeasonResult` (hạng/tier/ELO cuối mùa) cho mọi người có rank,
  thưởng xu theo tier (`seasonReward()` — số THAM KHẢO theo đúng đề xuất ban đầu của người dùng:
  Thách Đấu +10.000, Đại Cao Thủ +5.000, top 1 Thách Đấu +100.000 THAY VÌ cộng thêm, các bậc
  thấp hơn nội suy — cần chỉnh lại sau khi quan sát tốc độ kiếm/tiêu xu thật), rồi SOFT RESET
  ELO toàn bộ trong 1 câu SQL atomic (`elo = 1000 + ROUND((elo-1000)*0.5)`, không reset cứng về
  1000 — giữ lại 1 nửa khoảng cách so với mùa trước) + reset wins/losses/draws (season-scoped,
  không phải lifetime). `GET /duel/season` trả số mùa + ngày còn lại cho FE hiện đếm ngược.
  **CHƯA verify được rollover thật** (không mô phỏng được việc đổi tháng trong môi trường dev
  hiện tại) — chỉ verify được qua code review + `GET /duel/season` trả đúng dữ liệu tháng hiện
  tại sau khi deploy; sẽ tự biết đúng/sai vào đầu tháng sau.
- **Đấu đôi 2v2 (`src/modules/duel/team-duel.service.ts`, `TeamDuelService`)**: Giai đoạn 4
  minigame — kiến trúc SONG SONG với `DuelService` (hàng đợi/trạng thái trận RIÊNG, cùng "sống"
  trong `NotificationsModule` với cùng lý do `forwardRef()` tránh vòng lặp module), nhưng dùng
  CHUNG `UserRating`/rank tier/mùa giải với đấu 1v1 — KHÔNG dựng bảng xếp hạng/ELO riêng cho 2v2
  vì cùng đo 1 kỹ năng (phản xạ dịch từ vựng), đơn giản hơn nhiều so với 2 hệ song song. KHÔNG
  lưu lịch sử trận đấu (khác `DuelMatch` của 1v1) — bảng đó chưa từng hiển thị ở UI, thêm 1 bảng
  y hệt cho 4 người chơi (cần 4 cột khoá ngoại) chỉ tăng phức tạp schema mà chưa ai cần tra lại,
  bỏ qua tới khi thực sự cần. **Ghép đội**: hàng đợi solo (CHƯA hỗ trợ rủ bạn vào cùng đội trước
  — để dành bản sau), đủ 4 người thì ghép "rắn" (snake seed) theo ELO giảm dần — hạng 1+4 vào 1
  đội, hạng 2+3 vào đội kia — cân bằng ELO trung bình 2 đội tốt hơn ghép ngẫu nhiên. **Luật trận**
  y hệt 1v1 (8 câu, 8s/câu, độ khó theo `wordPoolSkipForElo(avgElo)` — ở đây là ELO trung bình
  CẢ 4 người) nhưng điểm ĐỘI = tổng điểm 2 thành viên; ELO tính theo ELO TRUNG BÌNH ĐỘI (công
  thức Elo chuẩn giữa 2 đội) rồi áp CÙNG 1 mức thay đổi cho cả 2 thành viên — không chia theo
  đóng góp riêng từng người. **Forfeit**: 1 người rớt mạng quá `DISCONNECT_FORFEIT_MS` (15s) mà
  không quay lại kịp thì XỬ THUA CẢ ĐỘI (không có cơ chế "chơi tiếp 2v1"). Sự kiện WebSocket
  `teamduel:join-queue`/`teamduel:leave-queue`/`teamduel:answer` (gửi) và
  `teamduel:matched`/`teamduel:round`/`teamduel:round-result`/`teamduel:finished` (nhận) — cùng
  namespace `/notifications` với 1v1. `GET /teamduel/queue-size` + `GET /teamduel/active` (tự
  phục hồi UI khi refresh giữa trận, y hệt `GET /duel/active`) ở `TeamDuelController`; rating/
  leaderboard/rank-tiers vẫn dùng chung endpoint của `DuelController` vì chung 1 bảng dữ liệu.
- **Hồ sơ công khai (`GET /users/:id/profile`, `UsersService.getPublicProfile()`)**: field an
  toàn để lộ công khai (KHÔNG email/settings/oauth như `getProfile()` của chính mình) — tên,
  avatar, ngày tham gia, streak, số từ đã thuộc (dùng lại luật LEARNED_WHERE giống
  leaderboard/progress, đã lặp lại theo đúng style repo thay vì trích thành helper dùng chung),
  số bài đã xong, huy hiệu ĐÃ MỞ KHOÁ (không phải toàn bộ catalog như `/achievements` của chính
  mình), số người theo dõi/đang theo dõi + danh sách rút gọn tối đa 30 mỗi bên, và `isFollowing`
  tương đối với người đang xem (`viewerId`).
- **Tìm người dùng (`GET /users/search?q=`, `UsersService.search()`)**: khớp `displayName`
  không phân biệt hoa/thường, HOẶC đúng mã người dùng (UID, tự nhận diện `q` có đúng định dạng
  UUID hay không để đổi cách khớp) — hữu ích khi trùng tên khó tìm, chỉ cần gửi UID cho nhau.
  Tối đa 20 kết quả, kèm `currentStreak`/`isFollowing` giống style `LeaderboardService.top()` —
  trước đây CHỈ tìm được người qua bảng xếp hạng (giới hạn top N) hoặc biết sẵn link hồ sơ,
  không có cách nào tìm 1 người quen theo tên. FE dùng ở `/messages` (nút "Tin nhắn mới") để bắt
  đầu hội thoại với người CHƯA từng nhắn tin trước đó, và ở `SendToFriendButton` (gửi huy
  hiệu/hồ sơ dưới dạng tin nhắn cho 1 người bạn cụ thể).
- **Xoá tài khoản (`DELETE /users/me`, `UsersService.deleteAccount()`)**: yêu cầu đúng mật khẩu
  nếu tài khoản có đặt mật khẩu (đăng nhập Google thuần thì bỏ qua), xoá file avatar trên đĩa,
  rồi `prisma.user.delete()` — KHÔNG cần logic dọn dẹp thủ công vì schema đã thiết kế sẵn
  `onDelete` đúng ý nghĩa cho từng quan hệ: `Video.createdBy`/`Notification.actor` dùng
  `SetNull` (nội dung/thông báo liên quan tới người KHÁC vẫn giữ lại, chỉ mất gắn tác giả), còn
  lại (settings, tiến độ, bình luận, tin nhắn, follow...) dùng `Cascade` (dữ liệu CÁ NHÂN xoá
  sạch). Route tự xoá cookie auth (`clearAuthCookies`) như lúc `/auth/logout`.
- **Nhắn tin trực tiếp (`src/modules/messages`, model `Conversation` + `DirectMessage`)**: 1-1,
  `Conversation.userAId` LUÔN nhỏ hơn `userBId` theo thứ tự chuỗi (chuẩn hoá ở
  `MessagesService.pairIds()`) để 1 cặp user chỉ có đúng 1 hội thoại dù ai nhắn trước.
  `GET /messages/conversations` (kèm tin nhắn cuối + số chưa đọc), `POST /messages/with/:userId`
  (lấy hoặc tự tạo hội thoại), `GET/POST .../messages` (phân trang/gửi, gửi có throttle 30/60s),
  `POST .../read`, `GET /messages/unread-count`. KHÔNG dựng gateway/namespace riêng — tái dùng
  `NotificationsGateway` (`emitToUser`) có sẵn, phát event `message:new` khác với
  `notification:new` trên cùng kết nối `/notifications`. `POST /messages/translate` (throttle
  20/60s, `MessagesService.translateText()`) dịch nhanh 1 tin nhắn ra pinyin + nghĩa tiếng Việt
  ngay trong khung chat — tái dùng `pinyin-pro` (giống `transcript.util.ts` của video) +
  `translateLinesToVi()` (module videos, dịch máy free có sẵn) thay vì xây bộ dịch riêng. Không
  lưu kết quả (khác cache dịch video — 1 hội thoại chỉ 2 người xem, không đáng cache DB), FE chỉ
  hiện nút "Dịch" khi tin nhắn có chữ Hán và tự cache trong state khi đã dịch 1 lần.
  **"Dịch trước khi gửi"** (`POST /messages/translate-compose`, throttle 20/60s,
  `MessagesService.translateForCompose()`) — KHÁC `translateText()` ở trên (dịch 1 tin ĐÃ gửi để
  đọc): dịch nội dung ĐANG SOẠN sang ngôn ngữ còn lại, KHÔNG tự gửi — trả `{translated}` để FE
  điền lại vào ô nhập cho người dùng xem/sửa rồi tự bấm Gửi (máy dịch không phải lúc nào cũng
  đúng, nhất là câu ngắn/khẩu ngữ). Tái dùng `translateSimple()` (mới tách ra ở
  `videos/translate.util.ts`, tổng quát hoá `callGoogle()`/`callMyMemory()` nhận tham số
  `sl`/`tl` thay vì cố định `zh-CN→vi`) — khác `translateLinesToVi()` (dành riêng bản chép video,
  có glossary/cache/gộp lô không phù hợp tin nhắn thường). Hướng dịch (`targetLang: 'zh'|'vi'`)
  do CLIENT tự nhận diện qua có chữ Hán trong nội dung hay không, gửi kèm trong request — server
  không tự đoán hướng.
  **Kết nối trước khi nhắn tin**: `getOrCreateWith()` chỉ tự tạo hội thoại MỚI nếu 2 người đã
  theo dõi nhau (1 trong 2 chiều, `Follow`) — hội thoại ĐÃ CÓ sẵn vẫn mở lại được bình thường dù
  sau đó bỏ theo dõi. Ném `ForbiddenException` (403) nếu chưa kết nối, để tránh cảm giác nhắn
  cho người lạ hoàn toàn không quen biết. **Báo đã xem**: `markRead()` phát `message:read` qua
  `NotificationsGateway` cho người GỬI khi có tin MỚI được đánh dấu đã xem (chỉ phát khi thực sự
  có gì đổi, tránh bắn thừa mỗi lần mở lại hội thoại cũ) — field `DirectMessage.readAt` vốn đã
  có sẵn, chỉ thiếu phần báo realtime. **Báo đang nhập**: `NotificationsGateway` có thêm
  `@SubscribeMessage('typing')` — client tự biết `toUserId` (người nhận) nên gateway chỉ CHUYỂN
  TIẾP, không tra lại DB; lưu `userId` vào `client.data` lúc `handleConnection()` để biết ai vừa
  gõ. Không lưu DB, chỉ là tín hiệu tức thời. **`GET /messages/usage-stats`**
  (`MessagesService.usageStats()`): số liệu TỔNG QUAN (không phải của riêng ai) — tổng hội
  thoại/tin nhắn, hội thoại/tin nhắn 7 ngày qua, và số hội thoại CÓ ÍT NHẤT 2 người thật sự nhắn
  qua lại (`conversationsWithReplies`, lọc bằng raw SQL `GROUP BY conversationId HAVING
  COUNT(DISTINCT senderId) >= 2` — phân biệt với hội thoại chỉ tạo ra rồi bỏ đó) — thêm để có
  căn cứ đánh giá tính năng nhắn tin có thực sự được dùng hay không, thay vì đoán.
- **Luyện nghe/phát âm (`src/modules/practice`)**: `POST /practice/attempts` ghi 1 lượt luyện
  (`wordId`, `skill: LISTENING|PRONUNCIATION`, `isCorrect?`). LISTENING: đúng/sai theo lựa chọn.
  PRONUNCIATION (từ 2026-09-18): client tự nhận diện giọng nói qua Web Speech API của trình
  duyệt (`webkitSpeechRecognition`, `lang: zh-CN`) rồi so văn bản nhận diện được với
  `word.simplified` (bỏ khoảng trắng/dấu câu) để tự chấm đúng/sai — server chỉ nhận kết quả
  `isCorrect` đã tính sẵn từ client, không tự chấm. Đây KHÔNG phải chấm thanh điệu/ngữ điệu thật
  (chỉ kiểm tra nói đúng từ chưa), và chỉ chạy được trên trình duyệt hỗ trợ Web Speech API
  (Chrome/Edge; Firefox/Safari không hỗ trợ `zh-CN` nên tự rơi về hành vi cũ — ghi nhận lượt
  luyện nhưng để `isCorrect = null`, không báo sai). `GET /practice/stats?skill=` trả tổng lượt
  luyện + số từ khác nhau + tỉ lệ đúng (tính trên các lượt CÓ chấm được, bất kể skill nào). Phát
  `AppEvent.PracticeAttempted`
  khi ghi nhận nhưng CHƯA có listener nào tiêu thụ (giống `QuizCompleted`) — chừa chỗ cho sau
  này (huy hiệu luyện tập, tính vào streak...), không tự ý gộp vào mục tiêu ngày hiện tại vì đó
  là quyết định sản phẩm cần bàn riêng.
- **Khảo sát đầu vào (`src/modules/onboarding`, model `OnboardingProfile`, 1-1 User)**: `GET`/
  `POST /onboarding` — hỏi đã học HSK chưa (+ cấp tự đánh giá), mục tiêu (`OnboardingGoal`), có
  định thi không (+ cấp muốn thi + hạn thi tuỳ chọn). `recommendedLevel` tính bằng LUẬT ĐƠN GIẢN
  (không gọi AI): = cấp tự đánh giá (ôn tiếp từ đó) hoặc HSK1 nếu chưa học. Nếu có đặt mục tiêu
  thi, ước tính số từ mới còn thiếu qua `HskLevel.cumulative2025` (cấp đích trừ cấp hiện tại),
  chia cho nhịp học `UserSettings.dailyGoalValue` ra số ngày cần học, so với hạn thi nếu có đặt
  để nhận xét nhịp độ (thoải mái/vừa đủ/gấp) — toàn bộ `recommendationVi` là text ghép luật, có
  thể làm lại khảo sát bất cứ lúc nào (upsert, ghi đè `completedAt`). `buildRecommendation()` in
  ra từng dòng có NHÃN RÕ RÀNG (📋 trình độ hiện tại / 🎯 mục tiêu / 👉 lộ trình đề xuất) thay vì
  gộp thành 1 câu văn xuôi — tránh đọc nhầm 2 số HSK khác nhau (vd tự đánh giá HSK5 nhưng đề xuất
  ghi "bắt đầu từ HSK1" từng bị hiểu lầm là lỗi vì không phân biệt được số nào là hiện tại/số nào
  là mục tiêu).
- **Trợ lý AI Hanni (`src/modules/assistant`)**: RAG qua Gemini (`@google/genai`), kiến trúc
  tham khảo từ project `tech-books-backend` cá nhân (in-memory vector store, model fallback
  chain `CHAT_MODELS`, cache index xuống `.cache/assistant-index.json` — KHÔNG commit). Có
  lịch sử hội thoại thật: mỗi lần hỏi, `HISTORY_LIMIT=16` tin nhắn gần nhất của ĐÚNG session đó
  được gửi kèm cho Gemini (`buildContents()`), nên câu hỏi nối tiếp ("từ đó viết Hán tự sao?")
  hiểu đúng ngữ cảnh câu trước — không phải mỗi câu hỏi là 1 lượt độc lập. Nguồn RAG (embedding,
  đánh index lúc boot qua `collectIndexSources()`) gồm 2 phần TĨNH: `GrammarPoint` ĐÃ CÓ giải
  thích thật (`explanationVi != ''`, ~235 điểm — KHÔNG dùng phần đại cương thô chưa giải thích)
  và `FAQ_ENTRIES` (6 câu hỏi thường gặp, chép tay khớp với FAQ trang chủ client) — mỗi mục = 1
  chunk (không cần chia nhỏ như PDF vì đã ngắn gọn sẵn), so theo `sourceId` (`grammar:<uuid>` /
  `faq:<i>`) để RESUME đánh index đúng phần còn thiếu, không làm lại từ đầu khi hết quota giữa
  chừng. Cộng thêm 1 nguồn ĐỘNG không tốn quota: `searchWordsByChineseTerms()` bắt Hán tự xuất
  hiện trong câu hỏi rồi tra thẳng `Word` (contains, không cần embed) — cho ground truth chính
  xác tuyệt đối về cấp HSK/nghĩa của ĐÚNG từ đang hỏi thay vì để model đoán. `POST /assistant/ask`
  (throttle 20/60s) ground thêm bằng dữ kiện cá nhân người hỏi qua `buildUserFactsBlock()`:
  streak, số từ đã thuộc/đến hạn, đề xuất từ `OnboardingProfile`, **bài học đang học dở**
  (`UserLessonProgress` mới nhất chưa `completedAt`), **video đang xem dở**
  (`UserVideoProgress` tương tự), và **xu hướng luyện tập 7 ngày qua** (số lượt ôn từ vựng qua
  `ReviewLog` + số lượt luyện nghe/phát âm qua `PracticeAttempt` theo `skill`) — prompt yêu cầu
  model CHỦ ĐỘNG nhắc tên bài/video đang dở khi trả lời kiểu "hôm nay học gì", không chỉ trả lời
  chung chung, để cảm giác thật sự hiểu người dùng chứ không phải chatbot tra cứu.
  Nhiều `ChatSession` song song như ChatGPT/Claude (`title` tự
  đặt từ tin nhắn đầu, không đổi lại sau) — `GET/POST /assistant/sessions`,
  `GET /assistant/sessions/:id/messages`, `DELETE /assistant/sessions/:id`. `POST /assistant/ask`
  nhận `sessionId` tuỳ chọn — bỏ trống thì tự tiếp tục phiên gần nhất (tự tạo nếu chưa có).
  **`GET /assistant/ask/stream`** (SSE qua `@Sse()`, nhận `message`/`sessionId` qua query vì
  `EventSource` chỉ hỗ trợ GET) đẩy từng đoạn chữ ngay khi Gemini sinh ra (`generateContentStream`,
  chỉ thử `CHAT_MODELS[0]` — không "đổi model giữa dòng" được — lỗi thì rơi về
  `generateWithFallback()` không streaming). `buildPromptContents()` gộp chung phần dựng
  prompt (RAG/từ vựng/dữ kiện cá nhân) cho cả 2 đường `ask`/`askStream`; `persistTurn()` gộp
  chung phần lưu DB. `GET /assistant/status` chẩn đoán (đã bật chưa, đã đánh index bao nhiêu).
  **TODO(scale)** ngay trong `assistant.service.ts`: throttle hiện tại chỉ chặn spam 1 user,
  CHƯA giới hạn tổng quota Gemini free tier khi nhiều user thật cùng dùng — cần nâng gói trả
  phí hoặc thêm hạn mức/ngày mỗi user trước khi ra mắt rộng (có thể gắn với tính năng nạp
  tiền/gói trả phí sau này, chưa làm). **Để trống
  `GEMINI_API_KEY` thì toàn bộ tự
  báo "chưa bật", không chặn app khởi động** — cần thêm `GEMINI_API_KEY` (+ `AI_SYSTEM_PROMPT`
  tuỳ chọn) vào `.env`/`.env.production.local` (đã có sẵn ở máy dev, cần copy tay lên VPS).
  **"AI Agent" — tool-calling (`TOOLS`, `executeTool()`)**: trợ lý gọi được 2 tool Gemini
  function-calling — `navigate_to_page` (16 trang tĩnh, `PAGE_PATHS`/`PAGE_LABELS_VI` — gồm cả
  `flashcard` "ôn flashcard" và `account` "đổi mật khẩu", tuỳ chọn
  `level` cho `learn`/`vocabulary`) và `open_video` (tìm `Video` theo `title`/`titleZh` chứa từ
  khoá). Cả 2 tool đều CHỈ ĐỌC dữ liệu và trả về 1 đường dẫn — không có tool nào tự đổi dữ liệu
  hay tự điều hướng thay người dùng (`resultForModel` luôn nhắc model mời người dùng tự bấm nút,
  KHÔNG được nói là đã tự mở/chuyển trang giúp — sửa đúng lỗi trợ lý hay bịa "đã mở video cho bạn
  rồi" mà thực ra không mở được gì). Description của tool + hướng dẫn hệ thống dạy model nhận ra
  câu hỏi "ở đâu"/"sao lâu rồi chưa..." cũng là ý định điều hướng (vd "ôn từ vựng ở đâu" ->
  page=study), không chỉ câu lệnh "mở X" tường minh. `askStream()`/`generateReply()` chạy tối đa
  2 lượt gọi model
  (lượt 1 có `config.tools`, lượt 2 bỏ tool để ép trả lời bằng text dựa trên
  `functionResponse`), field `action?: AssistantAction` (`{type:'navigate', path, label}`) trả
  về trong event `done` của SSE stream (và trong response `POST /assistant/ask`) — FE hiện nút
  bấm, không tự chuyển trang. Lưu ý: `persistTurn()` ghim `createdAt` của tin nhắn model lệch
  +1ms so với user (2 bản ghi tạo cùng lúc trong 1 transaction dễ trùng mốc thời gian tới từng
  mili-giây, làm `orderBy: createdAt asc` trả sai thứ tự khi tra lịch sử).

## Lệnh
`npm run start:dev` · `npm run build` · `npm run prisma:migrate` · `npm run db:seed` ·
`npm run data:build-words` · `npm test` · `npm run test:e2e`

## Trạng thái hiện tại
Core đã dựng: auth (email + Google), vocabulary, SRS (SM-2 + FSRS), progress, gamification
(streak/achievements/quiz), learn (744 bài — TOÀN BỘ HSK1-9 đã có chủ đề thật, xem bên dưới),
videos (học qua video, kèm bình luận 1 cấp trả lời + thích video), grammar (40 điểm HSK 1–3 +
195 điểm HSK 4–9 có giải thích thật, xem bên dưới), exams (lịch sử kiểm tra), leaderboard (xếp
theo từ đã thuộc), push (thông báo đẩy Web Push, VAPID, có nhắc học tự động mỗi giờ theo
`reminderHour`/timezone user), notifications (thông báo trong app —
lưu DB + đẩy realtime qua WebSocket khi có người trả lời bình luận/bình luận hoặc thích video
mình thêm/theo dõi mình), practice (lưu kết quả luyện nghe/phát âm lên server, xem bên dưới),
follows (theo dõi 1 chiều giữa người dùng, xem bên dưới), onboarding (khảo sát đầu vào → đề
xuất cấp HSK + lộ trình bằng luật đơn giản, xem bên dưới), assistant (trợ lý AI RAG qua Gemini,
xem bên dưới — cần `GEMINI_API_KEY` mới bật), health, Swagger.
Seed đầy đủ để deploy: 9 cấp HSK · huy hiệu · 10.9k từ (`data/processed/words.seed.json`) ·
744 bài, TOÀN BỘ 9 cấp đều chia theo chủ đề thật (xem bên dưới) — không còn cấp nào chia đều
15 từ/bài theo tần suất · 40 điểm ngữ pháp HSK 1–3 + 349 mục HSK 4–9 (đại cương,
prisma/seed/data/grammar-syllabus.raw.json, 195/349 mục đã có giải thích thật) · ~42 video
(`prisma/seed/vi-cache.json` cache bản dịch máy) · **`assets/audio/` ~58MB đã commit** (đừng
gitignore lại — deploy VPS cần).

**Bài học theo chủ đề (`/learn`)**: cấp nào có file
`data/curated/lesson-themes-hsk{level}.json` (mapping mỗi từ → 1 trong N chủ đề soạn tay,
xem `themeOrder`/`themeNames`) thì `scripts/import/build-words.ts` nhóm từ theo CHỦ ĐỀ trước
(vẫn sắp theo tần suất trong mỗi chủ đề), chủ đề dài hơn `MAX_THEME_LESSON` (16 từ) tự tách
"(1/2)", "(2/2)"... TOÀN BỘ HSK1-9 đã xong (không còn cấp nào chia đều "Bài N" kiểu cũ):
HSK1 (300 từ, 15 chủ đề, 27 bài), HSK2 (197 từ, 17 chủ đề, 19 bài), HSK3 (495 từ, 24 chủ đề,
43 bài), HSK4 (992 từ, 19 chủ đề, 70 bài), HSK5 (1.582 từ, 21 chủ đề, 109 bài), HSK6
(1.779 từ, 22 chủ đề, 119 bài), HSK7-9/level=7 gộp chung (5.567 từ — khối lớn nhất, hơn cả
HSK1-6 cộng lại — 23 chủ đề gồm 22 chủ đề cũ + chủ đề mới `thanh_ngu` cho thành ngữ 4 chữ vì
mật độ dày đặc ở cấp này, 357 bài). Đổi chủ đề cho DB ĐÃ seed sẵn (không xoá/tạo lại Word) thì
chạy `npx tsx scripts/migrate-lesson-themes.ts` (tự dò mọi cấp có file lesson-themes) — chỉ
cập nhật `Word.lessonId/lessonOrder` + upsert `Lesson.title`, không đụng `UserWordProgress`
nên tiến độ người dùng không mất. Idempotent, chạy lại vô hại (re-seed VPS mới cũng chỉ cần
file `data/curated/lesson-themes-hsk*.json` + chạy lại `data:build-words` rồi script này).
Script chạy qua tunnel SSH tới DB xa (VPS ở nước ngoài) có thể bị đứt kết nối giữa chừng nếu
chạy lâu (HSK7 ~5.5k từ từng bị rớt sau ~50 phút do tunnel) — script an toàn để chạy lại từ
đầu, nhưng nếu tiện hơn thì `git pull` + chạy thẳng trên VPS (kết nối `localhost:2222` nội bộ,
không qua internet) sẽ nhanh hơn nhiều (vài giây thay vì hàng chục phút).

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

**Ngữ pháp liên quan tới bài học** (`src/modules/grammar/grammar-match.util.ts`, từ
2026-09-18): trước đây `/grammar` là danh mục hoàn toàn tách biệt khỏi `/learn` — user phản
ánh app "trông rất loạn" vì các tính năng không liên kết với nhau. `GET /learn/lessons/:id`
giờ trả thêm `relatedGrammar` (điểm ngữ pháp ĐÃ có giải thích thật, cùng hskLevel với bài, có
từ khoá Hán tự khớp CHÍNH XÁC — không phải khớp chuỗi con — với 1 từ vựng thật trong bài).
Khớp chuỗi con bị loại bỏ có chủ đích: hầu hết `titleZh` chỉ có 1 hư từ (的/了/吗/把...), khớp
chuỗi con sẽ dính rất nhiều từ ghép không liên quan (vd. "了" là 1 phần của vô số từ khác) —
khớp chính xác theo từ đứng riêng lại chuẩn vì các hư từ này vốn dĩ CŨNG là từ vựng thật trong
bộ dữ liệu (的/了/吗/呢/在/有/和/几/多少/太... đều có trong Word). 40 điểm HSK1-3 (grammar.ts)
dùng bảng từ khoá tay `MANUAL_TOKENS` (titleZh của chúng không theo khuôn mẫu chung, tách tự
động dễ sai); 195 điểm HSK4-9 dùng tách tự động theo dấu `/`, `…`, `+`. Client:
`/learn/[lessonId]` hiện thẻ "Ngữ pháp liên quan" ở sidebar (chỉ khi có kết quả khớp — không
ép làm đầy nếu bài không có ngữ pháp nào liên quan thật), link sang `/grammar?level=N&open=slug`
— trang `/grammar` đọc 2 param này lúc mount (lazy initializer, KHÔNG dùng `useEffect`+setState
để tránh cảnh báo `react-hooks/set-state-in-effect`) để tự mở đúng điểm ngữ pháp đó.

**Luyện tập gắn theo bài học** (cùng đợt trên): trước đây `/listening`/`/pronunciation` chỉ
cho chọn cấp HSK rồi luyện ngẫu nhiên TOÀN BỘ từ của cấp đó, không liên quan gì tới bài đang
học. `GET /words` giờ nhận thêm `lessonId` (query, `WordQueryDto`) — lọc đúng từ của 1 bài học,
tự đổi `orderBy` sang `lessonOrder` thay vì `frequencyRank` khi có `lessonId`. Client:
`/learn/[lessonId]` có 2 nút "Luyện nghe"/"Luyện phát âm" → `/listening?lesson=<id>` (component
dùng chung `PracticeLibrary` nhận prop `lessonId`, tự ẩn phần chọn cấp độ và tự fetch tên bài
qua `useLesson()` khi có `lessonId`, có link "luyện tự do theo cấp độ" để thoát ra). `/writing`
KHÔNG dùng chung cơ chế này (đọc file tĩnh `hanzi-strokes/index.json` theo ký tự, không có khái
niệm lessonId) — gắn bài học cho `/writing` là việc riêng, chưa làm.

**Quiz** (`src/modules/gamification/quiz/quiz.service.ts`): `generate()` trộn 2 dạng câu —
`listening` (~`LISTENING_RATIO` 40% số câu, chỉ lấy từ có `audioUrl`, xếp trước) và `reading`
(còn lại) — mô phỏng thứ tự nghe-trước-đọc-sau của đề thi thật. Field `mode`/`audioUrl` trả về
theo từng câu, client tự quyết định ẩn/hiện Hán tự.

**Luyện nghe/phát âm lưu server** (`src/modules/practice`): trước đây `/listening` và
`/pronunciation` thuần client, kết quả mất khi rời trang. Giờ mỗi lần kiểm tra đáp án (nghe)
hoặc ghi âm xong (phát âm) đều gọi `POST /practice/attempts`; `GET /practice/stats?skill=`
cho tổng lượt luyện + số từ khác nhau + tỉ lệ đúng (cả LISTENING lẫn PRONUNCIATION từ
2026-09-18 — xem mục "Rank tier/season..." hoặc CLAUDE.md gốc). Xem thêm ở mục "Bình luận +
thích video + thông báo" phía trên.

**Câu ví dụ cho từ vựng** (`WordExample`, `scripts/seed-word-examples.ts`): HSK1 (300/300 từ)
đã có câu ví dụ do Hanni tự soạn (không qua dịch máy, tránh phụ thuộc quỹ MyMemory) —
`prisma/seed/data/word-examples-hsk1.json` (mảng `[simplified, pinyinNumeric, zh, vi]`, pinyin
sinh tự động bằng `pinyin-pro` lúc chạy script, không lưu tay để tránh sai dấu thanh). Script
CHUẨN — khớp Word theo `(simplified, pinyinNumeric)`, xoá ví dụ cũ của đúng các từ trong file rồi
tạo lại (idempotent, không đụng Word hay từ khác) — chạy tay `npx tsx
scripts/seed-word-examples.ts`, KHÔNG nằm trong `db:seed` mặc định (giống
`migrate-lesson-themes.ts`, phải chạy riêng sau khi seed Word lần đầu). Đã include ở
`GET /words/:id`, `/words/of-the-day`, và `GET /learn/lessons/:id` (learn.service.ts — trước đó
BỊ THIẾU include, đã sửa 2026-09-18). HSK2-9 (10.612 từ còn lại) CHƯA làm — cùng cách nếu làm
tiếp, tạo thêm `word-examples-hsk{N}.json` rồi gọi `seedFile()` cho từng file trong
`seed-word-examples.ts`.

Chưa làm (roadmap, chừa chỗ): câu ví dụ HSK2-9, cấu trúc đề thi HSK
thật đầy đủ (nhiều phần nghe/đọc/viết đúng số câu + thời gian từng cấp — hiện mới có câu
nghe/đọc trộn vào quiz từ vựng, chưa đúng cấu trúc thật), hội thoại luyện nói với AI theo tình
huống (kiểu Duolingo Video Call/Roleplay — trợ lý AI hiện tại chỉ hỏi-đáp + điều hướng, chưa
phải luyện hội thoại thực hành), ngữ pháp dẫn dắt theo bài học. Xem FEATURES.md mục 10 cho phân
tích đầy đủ + chiến lược tăng trưởng.
