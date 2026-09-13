# hanni-server — NestJS

API học tiếng Trung theo chuẩn **HSK 3.0** (9 cấp). Xem `README.md` cho tổng quan.

## Stack
- NestJS 11 + TypeScript (CommonJS, `module: nodenext`)
- PostgreSQL qua **Prisma 6** (`prisma/schema.prisma`)
- Redis (ioredis) — state OAuth, cache
- `@nestjs/event-emitter` (in-process) cho luồng sự kiện; handler phải **idempotent**
- `@nestjs/websockets` + `socket.io` (namespace `/notifications`) — đẩy thông báo realtime
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
  `/notifications/socket.io/`). 4 loại thông báo: `COMMENT_REPLY`, `VIDEO_COMMENT` (bình luận
  vào video mình thêm), `VIDEO_LIKE` (thích video mình thêm) — video hệ thống seed sẵn có
  `createdById = null` nên không phát 2 loại sau cho video đó — và `NEW_FOLLOWER` (xem dưới).
- **Theo dõi (`src/modules/users/follows`, model `Follow`)**: 1 chiều (không cần theo dõi lại
  nhau), `POST`/`DELETE /users/:id/follow` kiểu upsert/delete idempotent giống thích video, tự
  chặn tự theo dõi chính mình (400). Phát `AppEvent.UserFollowed` → `NotificationsListener` tạo
  `NEW_FOLLOWER`. `LeaderboardService.top()` trả thêm `isFollowing` mỗi dòng (so với người đang
  gọi API) để FE hiện nút theo dõi ngay trong bảng xếp hạng — hiện CHƯA có trang hồ sơ công khai
  hay danh sách người theo dõi/đang theo dõi, chỉ mới có nút bật/tắt. `GET /leaderboard` nhận
  thêm `scope=friends` (mặc định `global`) — lọc `rankedPairs()` còn (chính mình + người đang
  theo dõi) TRƯỚC khi tính hạng, cho FE làm thẻ "So với bạn bè" ở dashboard — theo dõi ai đó giờ
  có tác dụng cụ thể (so tiến độ) thay vì chỉ tăng follower count.
- **Luyện nghe/phát âm (`src/modules/practice`)**: `POST /practice/attempts` ghi 1 lượt luyện
  (`wordId`, `skill: LISTENING|PRONUNCIATION`, `isCorrect?` — chỉ dùng cho LISTENING vì
  PRONUNCIATION chưa có chấm điểm tự động, luôn lưu `null`). `GET /practice/stats?skill=` trả
  tổng lượt luyện + số từ khác nhau + (LISTENING) tỉ lệ đúng. Phát `AppEvent.PracticeAttempted`
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
  `study` "ôn flashcard" và `account` "đổi mật khẩu", tuỳ chọn
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
theo từ đã thuộc), push (thông báo đẩy Web Push, VAPID), notifications (thông báo trong app —
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

**Quiz** (`src/modules/gamification/quiz/quiz.service.ts`): `generate()` trộn 2 dạng câu —
`listening` (~`LISTENING_RATIO` 40% số câu, chỉ lấy từ có `audioUrl`, xếp trước) và `reading`
(còn lại) — mô phỏng thứ tự nghe-trước-đọc-sau của đề thi thật. Field `mode`/`audioUrl` trả về
theo từng câu, client tự quyết định ẩn/hiện Hán tự.

**Luyện nghe/phát âm lưu server** (`src/modules/practice`): trước đây `/listening` và
`/pronunciation` thuần client, kết quả mất khi rời trang. Giờ mỗi lần kiểm tra đáp án (nghe)
hoặc ghi âm xong (phát âm) đều gọi `POST /practice/attempts`; `GET /practice/stats?skill=`
cho tổng lượt luyện + số từ khác nhau + tỉ lệ đúng (chỉ LISTENING). Xem thêm ở mục "Bình luận +
thích video + thông báo" phía trên.

Chưa làm (roadmap, chừa chỗ): câu ví dụ cho từ vựng, cấu trúc đề thi HSK
thật đầy đủ (nhiều phần nghe/đọc/viết đúng số câu + thời gian từng cấp — hiện mới có câu
nghe/đọc trộn vào quiz từ vựng, chưa đúng cấu trúc thật), minigame, kết bạn/theo
dõi (mới có bình luận + thích video + thông báo, chưa có khái niệm bạn bè/follow).
