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
  DTO có `get`/computed property (không phải field thật, vd `PaginationDto.skip`/`take`) PHẢI
  đánh dấu `@Exclude()` (class-transformer) — nếu không, client gửi query trùng tên (vd `?take=`)
  sẽ khiến `plainToInstance` cố gán giá trị vào getter-only đó và crash 500 (`whitelist` không
  kịp lọc vì lỗi xảy ra TRƯỚC bước đó, trong lúc transform) — lỗi thật đã gặp ở `GET /words`,
  phát hiện tình cờ lúc test tính năng khác, không phải do client thật gửi sai.
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
- **Âm Hán Việt (`Word.hanViet`, `scripts/import/lib/hanviet.ts`, từ 2026-09-21)** — quyết
  định chủ động sau khi user phản ánh app "thuần là đi làm và copy lại, không có gì đặc thù
  hút user": 60-70% từ vựng tiếng Việt vay mượn từ tiếng Hán và giữ âm đọc Hán Việt thường
  TRÙNG khớp nghĩa tiếng Việt hiện đại (vd 學生→"học sinh", 時間→"thời gian", 國家→"quốc gia")
  — cầu nối ghi nhớ mạnh chỉ người Việt mới khai thác được, không app quốc tế nào (Duolingo,
  HelloChinese, Du Chinese...) nhắm tới. Nguồn: **Unihan Database** (Unicode Consortium,
  field `kVietnamese`, Unicode License V3 — miễn phí kể cả thương mại, xem `data/NOTICES.md`).
  **Ưu tiên tra theo ký tự PHỒN THỂ** (`traditional || simplified`) — verify thật: `kVietnamese`
  chính xác hơn nhiều khi tra theo phồn thể (學=học, 國=quốc đúng) so với giản thể bị hợp nhất
  chung ký hiệu (你/好 cho âm hiếm "nể"/"háo"), khớp với việc Hán Việt hình thành từ thời chữ
  Hán còn viết phồn thể. **2 lớp dữ liệu bù/sửa tay** (soạn dựa trên kiểm chứng thật trên
  chính bộ 10.9k từ Hanni, không đoán mò):
  `data/curated/hanviet-supplement.json` (~150 ký tự thông dụng Unihan CHƯA CÓ, vd 面/電/說/問
  — chỉ bù chỗ thiếu, không ghi đè) và `data/curated/hanviet-overrides.json` (~34 ký tự GHI ĐÈ
  dù Unihan đã có, cho 2 tình huống phát hiện qua kiểm chứng: (1) Unihan liệt kê NHIỀU âm cách
  nhau bằng khoảng trắng KHÔNG theo thứ tự phổ biến, vd 校 Unihan ghi "chò giâu hiệu" — âm đúng
  "hiệu" đứng CUỐI; (2) chỉ 1 âm nhưng hiếm/khác biệt rõ với âm phổ biến, vd 好 Unihan ghi
  "háo", âm phổ biến là "hảo"). `hanVietOf()` trả `null` cho từ nào THIẾU âm ở BẤT KỲ ký tự nào
  — "thà thiếu còn hơn hiện âm sai, không đoán mò cho đủ", khớp phong cách "best-effort, có ghi
  giới hạn" đã áp dụng cho ảnh minh hoạ từ vựng ở dưới. Kết quả: phủ **85.4%** (9.324/10.912
  từ). **Giới hạn đã biết, CHẤP NHẬN không sửa**: một số ký tự đa âm có 2 nghĩa/2 cách đọc Hán
  Việt khác nhau tuỳ ngữ cảnh (vd 樂/乐 vừa đọc "lạc" — vui vẻ — vừa đọc "nhạc" — âm nhạc — map
  1-ký-tự-1-âm không phân biệt được ngữ cảnh) — chọn giữ âm PHỔ BIẾN HƠN trong bộ từ Hanni
  (khảo sát 22 từ chứa ký tự này: "lạc" chiếm đa số) thay vì đoán mò theo hướng khác, chấp nhận
  vài từ như 音乐 hiện "âm lạc" thay vì "âm nhạc" đúng nghĩa hơn — tương tự cách 你 (chỉ 2 từ,
  không đủ tần suất để đáng sửa) cũng cố tình để nguyên âm Unihan gốc "nể" dù hiếm gặp. Backfill
  cho DB đã seed sẵn: `npx tsx scripts/backfill-hanviet.ts` (UPDATE theo LÔ 500 dòng/câu SQL
  thay vì 1 updateMany/từ — nhanh hơn nhiều qua tunnel SSH, xem cách làm cũ từng chậm ở
  `migrate-lesson-themes.ts`). Trả về tự nhiên trong `GET /words/:id`, `/words/of-the-day`,
  `GET /learn/lessons/:id`, `GET /study/queue` (không cần sửa code — các query này không có
  `select` giới hạn field nên Prisma tự trả đủ scalar field mới); `GET /study/leeches` có
  `select` tường minh nên phải thêm field vào tay. Client: hiện ở mặt sau flashcard ôn tập
  (`components/flashcard.tsx`) và mỗi thẻ từ ở `/vocabulary`. **Tìm kiếm** `GET /words?q=`
  giờ khớp cả `hanViet` (vd gõ "học hiệu" ra 学校 dù `meaningVi` hiển thị "trường học", không
  trùng chuỗi). **`GET /words/stats`** (`@Public()`, không cần đăng nhập) trả `{total,
  withHanViet}` — dùng cho hook thu hút user ngay ở trang chủ (`hanni-client/CLAUDE.md`),
  trước khi backfill chạy thì `withHanViet = 0` và client tự ẩn số liệu thay vì hiện số sai.
- **"Từ bạn đã biết sẵn" (`GET /words/familiar`, `@Public()`, từ 2026-09-22)** — hook thu hút
  nhóm khó tiếp cận nhất: người CHƯA từng học tiếng Trung. 773 từ có âm Hán Việt trùng khớp
  LUÔN nghĩa tiếng Việt (电话 = "điện thoại", 世界 = "thế giới", 机会 = "cơ hội", 决定 = "quyết
  định") — toàn từ dùng hàng ngày nên rất thuyết phục. Thông điệp đổi từ "học tiếng Trung đi"
  thành "bạn đã biết 773 từ rồi, chỉ là chưa nhận ra". **Không từ điển Trung-Việt nào khác dựng
  được danh sách này**: cần cùng lúc âm Hán Việt từng từ + nghĩa tiếng Việt + phép so khớp giữa
  hai thứ. So khớp ở tầng service (không SQL) cho dễ chỉnh: chuẩn hoá `meaningVi` (bỏ phần trong
  ngoặc kiểu "(khái niệm)", "(LT:個|个[ge4])", tách nghĩa theo `;` và `,`) rồi so CHÍNH XÁC với
  `hanViet` — nhận cả "chứa" thì lọt nhiều từ người đọc không thấy giống, mất tính thuyết phục
  của cả danh sách. Client: `/tu-da-biet`.
  **`GET /words/trial` (`@Public()`, từ 2026-09-22)** — 8 từ cho bộ thẻ học thử ở `/hoc-thu`,
  trang ĐÍCH của phễu SEO. Trước đó trang đó lấy thẳng `/words?level=1&pageSize=8`, tức 8 từ
  HSK1 thông dụng nhất: 的, 我, 你, 是, 了, 不, 在, 他 — toàn hư từ, không ảnh, âm Hán Việt chẳng
  gợi được gì ("đích", "liễu"), trong khi chính trang đó hứa "âm Hán Việt — cách người Việt nhớ
  chữ Hán nhanh nhất". Thẻ ĐẦU TIÊN người lạ nhìn thấy lại là thứ phản chứng cho lời hứa. Giờ
  lấy từ nhóm "đã biết sẵn" ở HSK1-3 (时间 = thời gian, 电话 = điện thoại, 机会 = cơ hội). Luật
  so khớp tách thành `hanVietMatchesMeaning()` dùng CHUNG với `familiarWords()` để 2 nơi không
  lệch nhau theo thời gian. Client có dự phòng rơi về truy vấn cũ nếu endpoint chưa sẵn sàng —
  trang prerender + cache 24h nên build trúng lúc endpoint chưa tồn tại là đóng băng trang trống
  cả ngày.
- **Từ điển CÔNG KHAI cho SEO (`GET /dictionary/:slug`, `/dictionary/slugs`, cả 2 `@Public()`,
  từ 2026-09-21)** — lý do làm: ĐO thật trên production thấy `sitemap.xml` chỉ có **6 URL** toàn
  trang chức năng (login/register/install), trong khi 10.912 từ + 235 điểm ngữ pháp đều nằm sau
  đăng nhập (`robots.txt` còn `Disallow` hẳn `/vocabulary`, `/grammar`) → toàn bộ kho nội dung
  HOÀN TOÀN vô hình với Google. Đây là nguyên nhân lớn nhất khiến app gần như không có người
  dùng thật (chỉ ~6 tài khoản không phải test). `lookup()` trả **mảng** `words` vì 1 Hán tự có
  thể ứng nhiều mục từ khác pinyin (đa âm), kèm `related` (12 từ cùng cấp) để bot có đường đi
  tiếp. **KHÔNG gọi `attachImage()`** (khác `get()`/`ofTheDay()`) — trang công khai có thể bị bot
  quét hàng loạt, không nên kéo theo hàng nghìn request sang Wikimedia. `publicSlugs()` chỉ trả
  từ CÓ `meaningVi` (từ thiếu nghĩa thì trang mỏng, không nên mời index) và `distinct` theo
  `simplified` vì URL là 1 Hán tự → 1 trang. Client: `/tu-dien/[slug]` + `/tu-dien` là **Server
  Component** (bắt buộc — nội dung phải nằm sẵn trong HTML thì Google mới đọc được), xem
  `hanni-client/CLAUDE.md`.
  **Phân tích từng chữ + từ cùng chữ (từ 2026-09-22)**: `lookup()` trả thêm `characters[]`
  (tách từ ghép thành từng chữ kèm âm Hán Việt riêng + nghĩa của chữ đó nếu nó tồn tại như mục
  từ đơn) và `compounds[]` (từ ghép khác chứa cùng chữ). Đây là chỗ khai thác SÂU nhất lợi thế
  Hán Việt — 电脑 = 电 (điện) + 脑 (não) thì người Việt đoán ra máy tính ngay. Research sư phạm
  (Hacking Chinese, YoyoChinese) xác nhận học theo thành phần hiệu quả hơn học từng từ rời rạc;
  với người Việt mỗi thành phần lại có sẵn một âm quen thuộc. Cũng làm trang DÀY hơn hẳn cho SEO
  và tạo liên kết nội bộ giúp bot bò sâu. `hanViet` lưu dạng "điện não" (âm cách nhau bởi khoảng
  trắng, theo THỨ TỰ ký tự) nên tách theo khoảng trắng là khớp 1-1 với từng chữ — nhưng CHỈ gán
  khi số âm KHỚP số chữ, lệch thì để `null` (thà thiếu còn hơn gán sai âm cho nhầm chữ).
  Kèm `videos[]` — video có lời thoại chứa từ này (tên + số câu), để người học nghe nó trong
  ngữ cảnh thật. **CỐ TÌNH không trích câu thoại ra làm "câu ví dụ"**: đã thử hướng đó và bỏ
  sau khi xem mẫu thật — video Hanni chủ yếu phim tu tiên/ngôn tình, phụ đề DỊCH MÁY, trích ra
  toàn câu sai/cụt (vd 等我用剑一草突破回去就是你的死期 → "Khi tôi sử dụng kiếm và cỏ đột phá,
  bạn sẽ ch…") hoặc từ vựng tu tiên vô dụng với người học HSK. Dạy sai hại hơn thiếu, Google
  cũng đánh giá thấp nội dung kiểu đó. Xem `FEATURES.md` mục 21.
- **Ngữ pháp CÔNG KHAI (`GET /grammar*` đều `@Public()`, từ 2026-09-22)**: 235 điểm có giải
  thích soạn tay là tài sản hiếm NHẤT của Hanni (không phải dữ liệu mở cào về như từ vựng), lại
  cạnh tranh SEO thấp hơn từ vựng nhiều. Client `/ngu-phap` + `/ngu-phap/[slug]`; `/grammar`
  trong app đã GỘP vào đó (cùng lý do gộp `/vocabulary` vào `/tu-dien`), trang mới còn tốt hơn
  vì mỗi điểm có URL riêng chia sẻ được thay vì accordion `?open=slug`. Chỉ liệt kê/sitemap mục
  CÓ giải thích thật — mục đại cương rút gọn (`flat`) mở ra là ngõ cụt.
- **Từ vựng hôm nay** (`GET /words/of-the-day`, route đăng ký TRƯỚC `words/:id` để tránh
  `ParseUUIDPipe` nuốt mất — xem `vocabulary.controller.ts`): 1 từ CỐ ĐỊNH theo ngày (đổi lúc 0h
  UTC), giống nhau cho mọi user, không lưu DB — xoay vòng theo `frequencyRank` (chỉ từ có nghĩa
  + có `frequencyRank`, tránh rơi vào từ hiếm) bằng `dayIndex % tổng số từ hợp lệ`.
- **Ảnh minh hoạ từ vựng** (`word-image.util.ts`, `WordsService.attachImage()`, từ 2026-09-18) —
  research xác nhận KHÔNG có dataset ảnh mở nào sẵn có cho từ vựng HSK (giống tình huống dataset
  hội thoại trước đó). Giải pháp: lấy DẦN qua **Wikimedia Commons** (API tìm kiếm, `action=query
  &generator=search&gsrnamespace=6` kết hợp `prop=imageinfo`) — **KHÔNG cần đăng ký API key**
  (khác Pexels/Unsplash đều bắt buộc key), hoàn toàn miễn phí, chỉ cần header `User-Agent` mô tả
  ứng dụng theo đúng chính sách của Wikimedia. Commons chỉ lưu media đã cấp phép tự do (CC0/
  CC-BY/CC-BY-SA/PD) nên ảnh trả về luôn hợp lệ bản quyền, không cần tự kiểm license từng ảnh.
  Lấy mỗi khi 1 từ lần đầu được xem qua `GET /words/:id` hoặc `/words/of-the-day`, cache vào
  `Word.imageUrl` để không gọi lại — không cào hàng loạt (tôn trọng hạ tầng dùng chung của
  Wikimedia), chỉ tích luỹ dần theo từ nào thật sự được xem. CHỈ áp dụng cho danh từ cụ thể
  (`pos` có `NOUN`) — hư từ/động từ trừu tượng không có gì để minh hoạ. Query tìm ảnh lấy từ
  `meaningEn` (rút gọn qua `imageQueryFrom()` — bỏ HẾT cụm trong ngoặc trước rồi mới xét tiền tố
  loại từ như "det.:", tránh cắt nhầm vào giữa chú thích kiểu "(LT:隻|只[zhi1])") chứ không phải
  `meaningVi`, vì tìm bằng tiếng Anh chính xác hơn nhiều. **Đã hoạt động thật, không cần bạn làm
  gì thêm** (khác payOS/GEMINI cần đăng ký). `GET /videos/:id`'s `tokens` (bấm từ trong video)
  cũng trả `imageUrl` nếu từ đó ĐÃ có sẵn trong cache — không tự fetch mới trong luồng xem video.
  **Giới hạn đã biết (best-effort, không hoàn hảo)**: khi `meaningEn` liệt kê NHIỀU nghĩa cách
  nhau bởi dấu phẩy (dữ liệu CEDICT gốc đôi khi không xếp nghĩa phổ biến lên đầu), code luôn lấy
  nghĩa ĐẦU TIÊN — gặp thật khi test: 苹果 (táo) có `meaningEn: "mincemeat, pome, apple, Empire"`
  nên lấy nhầm "mincemeat" ra ảnh bánh nhân thịt băm thay vì táo (đã xoá `imageUrl` sai này khỏi
  DB). Không có cách chọn đúng nghĩa đáng tin cậy mà không giải bài toán word-sense
  disambiguation (phức tạp, không xứng đáng cho 1 tính năng minh hoạ phụ) — chấp nhận đây là
  đánh đổi của 1 tính năng tự động miễn phí, đa số từ đơn nghĩa vẫn ra ảnh đúng (đã test 苹果,
  书, 八 đều đúng khi query rõ ràng). Nếu thấy ảnh sai ở từ nào, xoá tay `Word.imageUrl` của
  từ đó (set về `null`) để lần xem sau tự lấy lại — KHÔNG tự retry logic phức tạp hơn.
  **Lấy SẴN hàng loạt (`scripts/fetch-word-images.ts`, từ 2026-09-22)**: cơ chế "lấy khi có
  người xem" ở trên gần như không chạy khi lượng người dùng còn nhỏ — đo thật chỉ **51/10.912
  từ** có ảnh sau nhiều tháng. Script lấp sẵn để người học đầu tiên đã thấy ảnh, không phải là
  người "khai hoang" cho người sau. VẪN tôn trọng hạ tầng Wikimedia (lý do trước đó cố tình
  không cào): chạy TUẦN TỰ, `DELAY_MS` 400ms/request, không song song, User-Agent mô tả rõ ứng
  dụng. `--level=1,2,3` để ưu tiên cấp thấp (nơi người mới học), `--limit=N` để cắt ngắn; sắp
  theo `hskLevel` rồi `frequencyRank` nên dừng giữa chừng vẫn được phần thông dụng nhất.
  **Lỗi thật đã sửa cùng đợt**: `gsrnamespace=6` là namespace File của Commons — gồm CẢ
  audio/video/PDF. Query "sound" trả về `File:...ogg` mà `thumburl` là **ICON LOẠI FILE**
  (`fileicon-ogg.png`), tức từ vựng hiện icon file thay vì ảnh minh hoạ. Đã thêm
  `filetype:bitmap` vào truy vấn + chặn thêm lớp theo đường dẫn `file-type-icons`.
  **ĐỔI NGUỒN CHÍNH sang Wikipedia tiếng Trung (`searchWikipediaImage()`)**: cào hàng loạt làm
  lộ rõ lỗi word-sense nói ở trên không còn là chuyện lẻ tẻ nữa — 苹果 (`meaningEn` = "mincemeat,
  pome, apple, Empire") cho ra ảnh BÁNH NHÂN THỊT, và cào hàng loạt thì nhân rộng lỗi đó. Tra
  thẳng **Hán tự** trên `zh.wikipedia.org` (`prop=pageimages`) né hẳn bài toán chọn đúng nghĩa
  vì không phải dịch sang tiếng Anh nữa. Kiểm chứng thật: 苹果 → rổ táo, 医生 → tranh bác sĩ,
  书 → sách mở, 狗 → các giống chó. Commons giữ làm **dự phòng** khi Wikipedia không có bài.
  **Bản quyền**: CHỈ nhận ảnh có đường dẫn `/wikipedia/commons/` — ảnh upload riêng vào một wiki
  (`/wikipedia/zh/`) có thể là fair-use, KHÔNG được phép dùng lại. Script có cờ `--refresh` để
  lấy lại cả từ ĐÃ có ảnh (dùng khi đổi nguồn như lần này).
  **TRẦN HSK5 (`IMAGE_MAX_HSK_LEVEL`, từ 2026-09-22)** — lấy thử 15 danh từ HSK6 rồi kiểm tra
  tay: khoảng MỘT NỬA ra ảnh sai hẳn nghĩa (真相 "sự thật" → que diêm, 著作 "viết" → cái đầm phá,
  线索 "manh mối" → sân điền kinh). Từ càng lên cao càng TRỪU TƯỢNG, mà ảnh lấy từ ảnh đại diện
  bài Wikipedia của chính Hán tự — với vật thể cụ thể thì đúng (HSK1-5: 1.650/1.662 danh từ, đã
  kiểm tra tay), với khái niệm trừu tượng thì gần như tuỳ hứng. Gắn ảnh sai vào một từ là DẠY
  SAI liên tưởng, hại hơn là không có ảnh — cùng nguyên tắc "thà thiếu còn hơn sai" của âm Hán
  Việt và của việc không trích câu thoại video làm câu ví dụ. Chặn ở CẢ 2 đường: `attachImage()`
  và script (`--level=6` cũng bị trần chặn, phải `--max-level=` tường minh mới lách được). 16
  ảnh HSK6 lấy thử đã xoá khỏi production. **Hệ quả**: HSK6-9 sẽ không có ảnh cho tới khi có
  cách chọn ảnh đáng tin cho từ trừu tượng (vd danh sách soạn tay như `hanviet-supplement.json`).
  **Client hiện ảnh ở đâu**: từ điển công khai, popup bấm từ trong video, thẻ "Từ vựng hôm nay",
  bộ thẻ học thử, VÀ (từ 2026-09-22) mặt sau flashcard ôn tập + danh sách từ ở `/learn/[lessonId]`
  — trước đó luồng học chính không render ảnh nên người dùng tưởng chưa cào được ảnh nào.
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
  tổng số lượt ôn (MILESTONE), hoặc `learnedWords`/`totalWords` lấy từ `UserLevelProgress`
  (LEVEL — `threshold` ở nhóm này là SỐ CẤP HSK 1-9, không phải số từ, nên không dùng thẳng làm
  mẫu số).
  **Mốc SỚM (sửa 2026-09-21 sau khi ĐO dữ liệu production thật)**: trước đây mốc thấp nhất là
  streak 7 ngày / 50 từ "đã thuộc" — mà "đã thuộc" nghĩa là `nowLearned` trong `review.service.ts`
  (`state=REVIEW && intervalDays >= LEARNED_INTERVAL_DAYS` = 21 ngày), nên người mới KHÔNG THỂ
  nhận huy hiệu nào trong 3 tuần đầu dù học chăm tới đâu. Đo thật: **0/102 user từng mở khoá huy
  hiệu, streak dài nhất trong lịch sử app chỉ 3 ngày** (< ngưỡng 7) — tức là chưa ai từng chạm
  tới phần thưởng đầu tiên. Đã thêm nhóm **MILESTONE** (giá trị enum `AchievementCategory` có sẵn
  từ lâu nhưng CHƯA AI DÙNG — mồ côi giống `isLeech` trước đây) đếm THẲNG `ReviewLog` nên tăng
  ngay từ lượt ôn đầu tiên, cộng `STREAK_1`/`STREAK_3` và `WORDS_10`/`WORDS_25`. Người mới ôn
  xong 1 từ giờ nhận ngay 2 huy hiệu ("Bước đầu tiên" + "Ngày đầu tiên") kèm thông báo realtime
  có sẵn. **Ngưỡng kiểm tra đọc thẳng từ `ACHIEVEMENT_CATALOG`** qua `thresholdsOf(category)` —
  trước đây hardcode `[7,30,100]`/`[50,100,500,1000]` trong `onStreakUpdated`/`onWordReviewed`,
  thêm huy hiệu vào catalog mà quên sửa 2 mảng đó thì huy hiệu vĩnh viễn không mở khoá được mà
  KHÔNG báo lỗi gì. Huy hiệu mới `INSERT` qua **migration** (`20260921120000_add_early_achievements`,
  `ON CONFLICT DO NOTHING`) chứ không chỉ qua seed — vì CI/CD chỉ chạy `prisma migrate deploy`,
  KHÔNG chạy `db:seed`, nên sửa seed thôi sẽ không bao giờ lên tới production.
- **Bài đang học dở (`GET /learn/current`, `LearnService.currentLesson()`, từ 2026-09-22)** —
  user phản ánh flashcard và các tính năng khác "không phân theo lộ trình, chưa phân chủ đề,
  rất khó hiểu và loạn". Kiểm tra thì **dữ liệu đã chia chủ đề rất tốt** (HSK1: "Chào hỏi &
  giao tiếp xã giao" có 你好/谢谢/再见, "Gia đình & con người", "Đồ ăn & thức uống", "Thời
  tiết"...) — vấn đề nằm ở chỗ mỗi trang luyện tập TỰ chọn từ theo cấp HSK rồi lấy ngẫu
  nhiên/theo trang, nên người đang học bài "Gia đình" vào luyện nghe lại gặp toàn từ khác.
  Endpoint này để mọi trang hỏi CHUNG một chỗ thay vì mỗi nơi tự đoán. `path()` đã tính
  `currentLessonId` nhưng phải dựng cả lộ trình (mọi bài + tiến độ từng bài) mới ra — quá nặng
  cho việc chỉ cần 1 dòng. Ưu tiên bài ĐANG DỞ, sau đó tới bài chưa học đầu tiên.
  Client dùng ở `PracticeLibrary` (luyện nghe/phát âm), `/study` và `/writing` — xem
  `hanni-client/CLAUDE.md`. Quiz KHÔNG cần: quiz cuối buổi vốn đã truyền `wordIds` các từ vừa
  ôn, quiz khác ưu tiên từ trong `UserWordProgress` của chính người dùng.
- **Bỏ KHOÁ bài học (`LearnService.path()`, 2026-09-22)** — user phản ánh "mấy phần khóa khóa
  cũng hơi khó hiểu cho user mới". Trước đây bài sau chỉ mở khi bài trước học HẾT mọi từ, nên
  người mới mở `/learn` ra thấy 1 bài mở + 26 ổ khoá, KHÔNG kèm lời giải thích nào. Quan trọng
  hơn: các bài chia theo CHỦ ĐỀ (Chào hỏi, Gia đình, Đồ ăn, Thời tiết...) chứ không theo độ khó
  tăng dần, nên bắt học xong "Số đếm" mới được học "Đồ ăn" là vô lý. `LessonStatus` giờ chỉ còn
  `COMPLETED | IN_PROGRESS | AVAILABLE` (giá trị `LOCKED` XOÁ khỏi cả type union ở client). Định
  hướng vẫn giữ nguyên qua `currentLessonId` — gợi ý thay vì cấm; client đổi sang nhãn chữ "Bắt
  đầu từ đây"/"Học tiếp" trên đúng bài đó (xem `hanni-client/CLAUDE.md`).
- **"Tôi đã biết từ này rồi" — ẩn từ khỏi hàng đợi ôn (`isSuspended`, từ 2026-09-22)**: field
  `UserWordProgress.isSuspended` được ĐỌC đúng ở khắp nơi từ rất lâu (`getQueue()`,
  `getStats()`, `progress.service`, `reminder.service` đều lọc `isSuspended: false`) nhưng CHƯA
  CÓ chỗ nào GHI — field mồ côi y hệt `isLeech` trước đây. Lý do đáng làm: người Việt học tiếng
  Trung gặp RẤT NHIỀU từ đã biết sẵn qua âm Hán Việt (chính Hanni có trang `/tu-da-biet` liệt kê
  773 từ như vậy), bắt ôn đi ôn lại những từ đó là lý do bỏ app rất thật.
  `POST /study/words/:wordId/suspend` (body `{suspended}`) + `GET /study/suspended`.
  **Từ CHƯA từng học**: `setSuspended()` tạo sẵn 1 dòng `UserWordProgress` đang ẩn — `getQueue()`
  lấy từ mới bằng `progress: { none: { userId } }` nên chỉ cần TỒN TẠI dòng là từ đó không vào
  hàng đợi nữa, không phải sửa gì trong `getQueue()`.
  **CỐ Ý KHÔNG đánh dấu `learnedAt`** dù người dùng nói "đã biết": "từ đã thuộc" là một tiêu chí
  BẢNG XẾP HẠNG, cho tự khai là mở đường gian lận. Ẩn chỉ có nghĩa "đừng hỏi tôi nữa".
  `getStats()` thêm `suspendedCount`, và `inProgress` giờ lọc `isSuspended: false` — nếu không
  thì ẩn 20 từ là "vốn từ" ở dashboard tăng 20 mà người dùng chẳng học thêm gì.
  Client: nút ở mặt SAU flashcard (chỉ sau khi lật) + mục "Từ đã ẩn" có nút "Học lại" ở
  `/progress` — bỏ ẩn được thì người dùng mới dám ẩn.
- **`UserLessonProgress` chưa từng được GHI (sửa 2026-09-22)** — đo production: bảng 0 dòng
  trong khi đã có 127 lượt ôn; 4 chỗ ĐỌC nó, 0 chỗ GHI. Hậu quả im lặng, không lỗi gì:
  (1) `LearnService.currentLesson()` chọn bài đang học từ bảng này nên LUÔN trả bài ĐẦU TIÊN —
  mọi chỗ "bám bài đang học" (`/study`, `/writing`, `/listening`, `/pronunciation`) vĩnh viễn
  đứng ở bài 1 (đúng triệu chứng user từng phản ánh: "tự nhiên nhảy vào luôn đại từ nhân xưng ở
  flashcard à?"); (2) tiêu chí "bài đã xong" ở bảng xếp hạng + hồ sơ công khai luôn = 0 cho tất
  cả mọi người; (3) trợ lý AI được dạy phải nhắc tên bài đang học dở nhưng không bao giờ có dữ
  liệu. `ProgressService.recomputeLessonCache()` chạy trong listener `WordReviewed` (nền, không
  làm chậm lượt ôn), định nghĩa "xong bài" lấy ĐÚNG như `LearnService.path()` để 2 nơi không nói
  2 kiểu. Phần quá khứ dựng lại bằng `npx tsx scripts/backfill-lesson-progress.ts` (đã chạy trên
  production: 46 dòng / 6 người dùng).
- **Refresh token trùng nhau làm ĐĂNG XUẤT OAN (sửa 2026-09-22)** — đo log production: **661
  lần** `Phát hiện dùng lại refresh token` với chỉ 6 người dùng thật, có lúc 3 lần trong CÙNG 1
  giây cùng 1 family. Không phải bị tấn công: một trang như dashboard bắn cả chục request song
  song, access token hết hạn thì tất cả cùng 401 rồi cùng gọi `/auth/refresh` với CÙNG một
  cookie; request đầu xoay token xong, các request sau mang token vừa revoke tới nên bị coi là
  trộm → `revokeFamily()` huỷ luôn cả token MỚI → user văng ra màn đăng nhập. Đây là lỗi kinh
  điển của refresh token rotation. Sửa 2 đầu: `TokenService.rotate()` thêm `REUSE_GRACE_MS`
  (30s — Auth0/Okta gọi là "reuse interval"), trong cửa sổ đó thì cấp cặp mới trong CÙNG family
  thay vì huỷ tất cả; client gộp chung 1 lượt refresh cho mọi request đang chờ (xem
  `hanni-client/CLAUDE.md`). Token bị đánh cắp dùng lại SAU cửa sổ vẫn bị phát hiện như cũ.
  **Đánh đổi đã biết**: mỗi lượt refresh trùng trong cửa sổ ân hạn tạo THÊM 1 token trong cùng
  family (trình duyệt chỉ giữ cookie cuối, số còn lại thành token thừa còn hiệu lực tới khi hết
  hạn). Không phải lỗ hổng (cùng family, cùng user, quyền y hệt nhau) và sau bản sửa phía client
  thì đường này hiếm khi chạy — chỉ còn khi mở nhiều tab/thiết bị cùng lúc.
- **Giờ nhắc học mặc định khi bật thông báo (sửa 2026-09-22)** — đo production: `reminderHour`
  NULL ở **102/102** tài khoản, nghĩa là `ReminderService` (nhắc học mỗi ngày) chưa từng gửi
  được cho ai. Lý do: giờ nhắc chỉ đặt được bằng 1 ô chọn nằm sâu trong `/settings`, sau khi đã
  bật thông báo — gần như không ai đi hết quãng đó. `PushService.subscribe()` giờ đặt
  `DEFAULT_REMINDER_HOUR` (20h) khi `reminderHour` đang NULL: người vừa chủ động cấp quyền thông
  báo thì "nhắc học mỗi ngày" chính là thứ họ vừa đồng ý, và job vốn đã bỏ qua ai đạt mục tiêu
  ngày hôm đó. **Chỉ đặt khi đang NULL** — không ghi đè lựa chọn của người đã tự chỉnh.
- **`MAIL_HOST` trống trên production (phát hiện 2026-09-22, CẦN BẠN CẤU HÌNH)** — email xác
  minh, đặt lại mật khẩu quên và bản tin tuần chỉ được log ra console, không bao giờ tới nơi,
  trong khi 101/102 tài khoản đang bật "Email tổng kết tuần". Đăng nhập KHÔNG chặn người chưa
  xác minh nên không ai bị kẹt, nhưng **quên mật khẩu là mất tài khoản**. Code đã đúng từ lâu,
  chỉ thiếu biến môi trường. `GET /mail/configured` (mới) để client báo thật thay vì bày ra giao
  diện như đang chạy — cùng cách `/payments/configured` ẩn phần nạp xu khi chưa có payOS.
- **Index quan trọng cho queue SRS**: `UserWordProgress (userId, dueAt)` và `(userId, hskLevel, dueAt)`.
- **"Từ khó nhớ" (leech, thuật ngữ Anki) — `GET /study/leeches` (từ 2026-09-19)**: phát hiện qua
  research chủ động (rà lại code, không phải yêu cầu cụ thể của user) — field `UserWordProgress.
  isLeech` (`out.lapses >= LEECH_LAPSES`, ngưỡng 8 lần sai, `sm2.scheduler.ts`) đã được TÍNH VÀ
  LƯU ĐÚNG mỗi lần review từ rất lâu (`ReviewService.review()`) nhưng CHƯA TỪNG có API/UI nào đọc
  lại — field mồ côi hoàn toàn (khác `reminderHour`/`maxReviewsPerDay` từng ghi trước đó, ít
  nhất 2 field đó còn có 1 đầu dùng tới). Đây là tín hiệu SRS có giá trị thật (Anki coi "leech
  review" là công cụ quan trọng giúp người học biết chính xác từ nào cần chú ý nhiều hơn), tận
  dụng ngay vì không tốn gì thêm để tính lại — chỉ cần đọc. `ReviewService.getLeeches()` trả
  danh sách từ `isLeech: true` kèm thông tin từ, sắp theo `lapses` giảm dần — KHÔNG lọc theo
  `dueAt` (khác `getQueue()`) vì đây là màn "xem toàn bộ từ khó" để người học biết, không phải
  hàng đợi ôn hôm nay. `getStats()` cũng trả thêm `leechCount` cho tiện hiện số lượng nhanh.
  Client: section "Từ khó nhớ" ở `/progress` (chỉ hiện khi có ít nhất 1 từ, không ép hiện rỗng),
  kèm nút "Ôn riêng N từ này" mở `/study?leeches=1` (từ 2026-09-22) — trước đó mục này chỉ LIỆT
  KÊ, xem xong không làm gì được. `getLeeches()` vì vậy trả NGUYÊN `word` (kèm `examples`) thay
  vì bản `select` rút gọn: thẻ flashcard cần đủ field giống hàng đợi thường. Buổi ôn đó vẫn ghi
  nhận lượt ôn qua `review()` bình thường — ôn sớm một từ hay quên chính là việc cần làm, SM-2 tự
  tính lại chu kỳ theo số ngày đã trôi qua nên không phá lịch (KHÔNG cần tới `ReviewType.CRAM`,
  enum đó vẫn mồ côi).
  **Gỡ leech (làm 2026-09-22)**: `isLeech = out.lapses >= LEECH_LAPSES && !nowLearned` — sai
  nhiều lần nhưng nay đã đạt chu kỳ ôn của từ "đã thuộc" thì bỏ đánh dấu. Trước đó `isLeech`
  một khi bật là bật MÃI, nên từ đã nhớ được vẫn nằm trong "Từ khó nhớ" ở `/progress`: vừa sai
  vừa làm người học nản vì danh sách chỉ dài thêm, không bao giờ ngắn lại. Dùng chính ngưỡng
  `nowLearned` có sẵn thay vì nghĩ ra ngưỡng riêng — một từ đạt mức "đã thuộc" thì theo định
  nghĩa không còn là từ khó nữa. **Chưa làm**: chế độ "cram" ôn
  riêng từ khó bất kể có đến hạn hay không (enum `ReviewType.CRAM` cũng đang mồ côi tương tự,
  ghi nhận nhưng chưa làm vì cần thiết kế lại `review()` để không ảnh hưởng lịch SRS thật).
- **Push GỬI CHO CẢ TIN NHẮN + TƯƠNG TÁC (sửa 2026-09-22)** — lỗi thật user báo: "chưa thấy
  app gửi thông báo, ví dụ tin nhắn tới". Kiểm tra đúng vậy: `PushService.sendToUser()` CHỈ
  được `ReminderService` gọi (nhắc học theo lịch). `NotificationsService.create()` chỉ lưu DB +
  `emitToUser` WebSocket, còn `MessagesService` thậm chí KHÔNG tạo `Notification` — chỉ emit
  `message:new`. Nghĩa là mọi thông báo tương tác (trả lời bình luận / thích video / theo dõi /
  mở khoá huy hiệu) lẫn tin nhắn chỉ tới được người đang MỞ SẴN app; đóng app là im lặng hoàn
  toàn, dù hạ tầng Web Push đã có đủ. Giờ `create()` gửi push kèm nội dung theo từng
  `NotificationType` (`pushTextFor()`), và `sendMessage()` gọi `sendMessagePush()` (tên người
  gửi + trích 80 ký tự đầu). Cả hai đều **không `await`** — push chậm/lỗi không được làm chậm
  luồng chính, lỗi chỉ `logger.warn`. `PushModule` phải `exports: [PushService]`.
  **Vấn đề gốc còn lại**: đo production **0 người từng bật thông báo**, vì chỗ bật duy nhất nằm
  trong `/settings`. Client đã thêm `NotificationNudge` ở dashboard (xem `hanni-client/CLAUDE.md`).
- **Push (`src/modules/push`)**: dùng `web-push` + khóa VAPID (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`
  trong env, sinh bằng `npx web-push generate-vapid-keys`). Để trống 2 khóa thì API trả 503 rõ ràng,
  không chặn app khởi động. `PushSubscription` xoá tự động khi gửi gặp lỗi 404/410 (thiết bị đã gỡ
  đăng ký). Gửi thủ công qua `POST /push/test`, VÀ có **nhắc học tự động**
  (`ReminderService`, `@nestjs/schedule` — `ScheduleModule.forRoot()` ở `app.module.ts`):
  mỗi giờ (`@Cron(CronExpression.EVERY_HOUR)`) quét user có `UserSettings.reminderHour` khớp
  giờ địa phương hiện tại (`getLocalHour()` trong `time.util.ts`, theo `User.timezone`) VÀ có ít
  nhất 1 `PushSubscription`, bỏ qua ai đã đạt mục tiêu ngày hôm nay (`UserDailyActivity.goalMet`
  của ngày local — tính bằng `localStudyDate()`/`STREAK_DAY_CUTOFF_HOUR` giống `StreakService`)
  — tránh nhắc thừa khi đã học đủ. **Nội dung CÁ NHÂN HOÁ** (từ 2026-09-19) — trước đó câu nhắc
  luôn chung chung ("Chỉ vài phút ôn từ vựng..."), giờ đếm số từ đang đến hạn (`UserWordProgress`
  active states + `dueAt <= now`, CÙNG điều kiện `getStats()`'s `dueNow`) rồi ghi thẳng số vào
  nội dung ("Bạn có N từ cần ôn hôm nay") — thông báo có số liệu thật ghi nhận hiệu quả hơn nhắc
  nhở mơ hồ trong nghiên cứu hành vi push notification. Rơi về câu chung chung "Học thêm vài từ
  mới..." nếu không có từ nào đến hạn (vd user mới, chưa có gì để ôn). Chạy theo GIỜ (không phải phút) nên chỉ khớp đúng 1 lần/ngày
  cho hầu hết user, trừ số ít timezone lệch nửa giờ (vd Asia/Kathmandu) — chấp nhận được, một
  lời nhắc không cần chính xác tới phút. `PushService.sendToUser()` (tách riêng khỏi
  `sendTest()`) không throw nếu chưa bật/chưa có subscription, vì đây là job nền chạy cho nhiều
  user chứ không phải request của chính user đó. Riêng cảnh báo **"sắp mất chuỗi"**
  (`sendStreakRiskReminders()`, cùng file) chạy lúc `STREAK_RISK_HOUR` cố định (21h local, KHÔNG
  cho user tự chỉnh như `reminderHour`) cho ai có `currentStreak > 0` nhưng CHƯA có bản ghi
  `UserDailyActivity` nào hôm nay — điều kiện khác nhắc thường (`goalMet`) vì streak chỉ cần
  hoạt động ĐẦU TIÊN trong ngày là giữ được (`StreakService.recordActivity()`'s `wasNewDay`),
  không cần đạt đủ mục tiêu — cơ chế giữ chân người dùng kiểu Duolingo. **Nhắc sớm cuối tuần**
  (`sendWeekendEarlyRiskReminders()`, từ 2026-09-19) — research hành vi Duolingo: thứ Sáu/thứ
  Bảy là 2 ngày mất streak nhiều nhất (bận đi chơi/tụ tập). Thêm 1 job riêng gửi SỚM hơn lúc
  `WEEKEND_EARLY_RISK_HOUR` (17h local) CHỈ vào 2 ngày này (`getLocalWeekday()` trong
  `time.util.ts`, ISO 5/6) cho ai chưa có hoạt động — KHÔNG thay thế lời nhắc 21h thường, cả 2
  job độc lập tự kiểm tra lại `UserDailyActivity` nên không gửi trùng nếu user đã học ở giữa 2
  mốc giờ.
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
- **Premium (`src/modules/premium`, field `User.premiumUntil`, từ 2026-09-19)** — quyết định
  SẢN PHẨM QUAN TRỌNG đã hỏi thẳng người dùng trước khi làm (2 câu hỏi qua AskUserQuestion):
  (1) **KHÔNG khoá bất kỳ nội dung học nào** — toàn bộ 9 cấp HSK/từ vựng/ngữ pháp vẫn miễn phí y
  hệt hiện tại, khác hẳn app đối thủ tham khảo lúc thiết kế (khoá HSK2-9 sau paywall). Premium ở
  Hanni CHỈ mở thêm TIỆN ÍCH, KHÔNG đụng tới giá trị giáo dục cốt lõi — tránh rủi ro user hiện
  tại bị mất quyền truy cập nội dung đang dùng miễn phí. (2) **Trả 1 lần cho N tháng, KHÔNG tự
  động gia hạn định kỳ** — payOS chỉ hỗ trợ thanh toán 1 lần (không có API thu định kỳ kiểu thẻ
  tín dụng), nên hết hạn tự rơi về free, không tự trừ tiền tiếp. Bảng giá THAM KHẢO (tự điều
  chỉnh ở `premium-plans.ts`, cố tình định giá THẤP hơn nhiều so với app đối thủ vì không khoá
  nội dung): Premium tháng 19k, 3 tháng 49k, 6 tháng 89k, năm 149k, trọn đời 399k.
  **Dùng CHUNG bảng `PaymentOrder`/webhook payOS với nạp xu** (thêm cột `kind: TOPUP|PREMIUM` +
  `premiumPlanKey`) thay vì dựng luồng thanh toán riêng — tái dùng nguyên vẹn logic xác thực chữ
  ký + idempotent đã có. `PaymentsService.createPremiumCheckout()` y hệt `createTopUp()` nhưng
  `amountVnd` lấy từ giá gói, `xuAmount: 0`; `handleWebhook()` branch theo `order.kind`: TOPUP
  thì `wallet.credit()` như cũ, PREMIUM thì `extendPremiumUntil()` (premium-plans.ts) rồi ghi
  `User.premiumUntil`. **Cộng dồn khi mua thêm lúc đang Premium** — nối tiếp từ hạn cũ (nếu còn
  hiệu lực) thay vì tính lại từ hôm nay, giống chuẩn gia hạn subscription thông thường. Gói
  "trọn đời" lưu bằng MỐC XA (`PREMIUM_LIFETIME_UNTIL`, năm 2099) thay vì cột boolean riêng —
  mọi chỗ chỉ cần so `premiumUntil > now()` (`isPremiumActive()`), không cần rẽ nhánh thêm.
  `PremiumService.getStatus()` (`GET /premium/status`) đọc thẳng `User.premiumUntil`, KHÔNG phụ
  thuộc `PaymentsService` (tránh vòng lặp module — `PremiumModule` không cần import
  `PaymentsModule` vì checkout endpoint nằm ở `PaymentsController`, chỉ import 2 hàm thuần từ
  `premium-plans.ts`).
  **Các quyền lợi THẬT đã cài** (không hứa suông — chỉ liệt kê đúng những gì có code, xem thêm
  mục "Nhân đôi xu" ở phần Danh hiệu bên dưới cho quyền lợi mới nhất):
  (1) **Trợ lý AI không giới hạn lượt hỏi/ngày** — giải quyết đúng `TODO(scale)` đã ghi từ trước
  ở `assistant.service.ts` (cần hạn mức/ngày trước khi ra mắt rộng, tránh hết chung quota Gemini
  free tier): `checkDailyAskQuota()` đếm `ChatMessage` role USER trong "ngày học" (timezone user
  + `STREAK_DAY_CUTOFF_HOUR`, đồng bộ cách tính ngày với streak/nhiệm vụ hàng ngày), free giới
  hạn `FREE_ASK_DAILY_LIMIT` (15) lượt/ngày, Premium bỏ qua hoàn toàn. Gọi ở CẢ `ask()` (ném
  `ForbiddenException`, hiện lỗi rõ ràng cho REST) lẫn `askStream()` (bọc try/catch RIÊNG trả về
  1 dòng `delta` thân thiện qua SSE — nếu để lọt vào catch-all chung của stream sẽ chỉ còn thấy
  "Có lỗi xảy ra" chung chung, mất hẳn thông điệp mời nâng cấp). (2) **Khung avatar "Phượng
  Hoàng" độc quyền** — thêm cờ `premiumOnly` vào `AvatarFrame` (`frame-catalog.ts`), khung này
  KHÔNG mua được bằng xu (`ShopService.buy()` chặn thẳng), tự động coi là "đã sở hữu" khi đang
  Premium (`getCatalog()`), mất quyền DÙNG (không mất quyền hiển thị nếu đã trót chọn — user tự
  chọn khung khác) nếu Premium hết hạn (equip() kiểm tra lại `isPremiumActive()`). Hồ sơ công
  khai (`getPublicProfile()`) trả thêm `isPremium` để hiện huy hiệu "PREMIUM" cạnh tên.
  **CHƯA thể test luồng thanh toán thật** (giống nạp xu ở trên — chưa có tài khoản merchant
  payOS thật), chỉ verify được qua `GET /premium/status` + `/payments/configured` trả đúng và
  UI tự ẩn nút thanh toán gọn gàng khi chưa cấu hình.
  **3 lỗi thật đã phát hiện + sửa qua code review chủ động (2026-09-19, không phải user báo)**:
  (1) `extendPremiumUntil()` cộng tháng bằng `Date#setMonth` bị TRÀN NGÀY khi ngày gốc không
  tồn tại ở tháng đích (vd 31/1 + 1 tháng ra 3/3 thay vì 28/2 — verify bằng chạy thử thật) — sửa
  bằng `addMonthsClamped()` (đặt ngày về 1 trước khi đổi tháng, tính lại ngày cuối tháng đích
  rồi kẹp về đó, dùng mốc UTC vì `premiumUntil` là 1 thời điểm tuyệt đối không phụ thuộc
  timezone tiến trình Node). (2) Mua thêm gói CÓ HẠN khi đang TRỌN ĐỜI làm `premiumUntil` cộng
  vượt qua mốc `PREMIUM_LIFETIME_UNTIL`, khiến `isLifetimePremium()` sai lệch và Premium hiện
  sai thành "còn hạn tới ngày X" thay vì trọn đời — sửa bằng early-return giữ nguyên trọn đời
  nếu đang trọn đời. (3) `handleWebhook()` đọc `order.status` rồi mới ghi PAID ở bước riêng
  (không atomic) — payOS xác nhận có gọi lại webhook nhiều lần cho cùng giao dịch, 2 lượt gọi
  trùng nhau chạy gần đồng thời đều có thể đọc thấy PENDING trước khi bên nào commit xong PAID,
  cộng xu/gia hạn Premium 2 lần cho 1 giao dịch thật — sửa bằng `updateMany({where: {id, status:
  PENDING}})` (atomic ở tầng DB, `count === 0` nghĩa là request khác đã xử lý, bỏ qua an toàn),
  cộng thêm log ERROR rõ ràng nếu bước cộng thưởng thất bại SAU KHI đã chắc chắn PAID (không
  lùi lại PENDING vì payOS sẽ không gọi lại nữa — cần đối soát thủ công thay vì nuốt lỗi im
  lặng). **Còn 1 rủi ro hẹp CHƯA sửa (chấp nhận, không đáng công sức)**: 2 ĐƠN Premium khác
  nhau của CÙNG 1 user xử lý gần như đồng thời (2 lần thanh toán thật liên tiếp) vẫn đọc-rồi-ghi
  không atomic trên `User.premiumUntil` — có thể mất 1 lần gia hạn nếu trùng đúng khung thời
  gian rất hẹp này; khắc phục triệt để cần khoá dòng (`SELECT ... FOR UPDATE`) hoặc tính atomic
  bằng SQL thô, không xứng đáng độ phức tạp cho 1 tình huống cực hiếm ở quy mô hiện tại.
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
- **Giải đấu học tập theo TUẦN** (`src/modules/leaderboard/league.service.ts`, `LeagueService`,
  từ 2026-09-19) — research xác nhận thăng/giáng hạng theo tuần là cơ chế GIỮ CHÂN mạnh nhất
  của Duolingo (streak 7+ ngày giữ chân gấp 2.4 lần, loss aversion tăng ~35% DAU) — bảng xếp
  hạng cũ ở `leaderboard.service.ts` (5 tiêu chí) đều TĨNH VÔ TẬN, không tạo áp lực quay lại mỗi
  tuần như cơ chế này. **KHÁC HẲN ELO đấu 1v1** (xếp theo mức độ HỌC TẬP — số lượt ôn SRS hoàn
  thành trong tuần, tính trực tiếp từ `ReviewLog.reviewedAt`, KHÔNG lưu điểm riêng để tránh
  trùng lặp dữ liệu — không phải thắng/thua khi đấu), tên bậc CỐ Ý khác ("Đồng→Kim Cương" chủ đề
  đá quý ở `league.util.ts`, không phải "Sắt→Thách Đấu" của đấu 1v1) để không gây nhầm 2 hệ xếp
  hạng. Khoá tuần `currentWeekKey()` tự tăng dạng "W123" tính từ 1 mốc thứ Hai cố định (KHÔNG
  dùng số tuần ISO lịch — tránh phải xử lý các trường hợp biên qua năm, chỉ cần tăng đều đặn mỗi
  7 ngày). Mỗi user CÙNG bậc xếp chung 1 nhóm (không chia nhiều phòng ~30 người/phòng như
  Duolingo — quy mô Hanni hiện tại chưa cần, đơn giản hoá cho phù hợp). `@Cron(EVERY_DAY_AT_2AM)`
  kiểm tra mỗi ngày, chỉ THẬT SỰ rollover khi khoá tuần đổi (idempotent). Lúc rollover: mỗi
  nhóm-bậc tự xếp hạng theo điểm tuần, top ~20% (tối đa 3, tối thiểu 1) thăng 1 bậc, đáy ~20%
  giáng 1 bậc, giữa an toàn — nhóm dưới 5 người (`MIN_GROUP_FOR_MOVEMENT`) thì KHÔNG giáng ai
  (tránh giáng oan lúc còn ít user hoạt động tuần đó). Người chưa từng tham gia bắt đầu ở bậc
  thấp nhất (Đồng) khi lần đầu xem giải đấu (`getOrCreateMyEntry()`), người tuần trước có tham
  gia thì MANG NGUYÊN bậc mới (đã thăng/giáng) sang tuần tiếp theo. **KHÔNG có thưởng xu** (khác
  mùa ELO đấu 1v1 ở trên) — tránh động đến cân bằng kinh tế xu chưa được xác nhận, đây thuần là
  cơ chế tâm lý (thăng/giáng hạng), không phải kinh tế. **CHƯA verify được rollover thật** (như
  mùa ELO ở trên, không mô phỏng được đổi tuần trong môi trường hiện tại) — chỉ verify qua
  `GET /leaderboard/league` trả đúng dữ liệu tuần hiện tại. Client: thẻ "Giải đấu tuần"
  (`components/weekly-league-card.tsx`) ở dashboard — CỐ Ý không chèn vào hệ thống tab đã có ở
  `/leaderboard` (khác hẳn cấu trúc dữ liệu — nhóm theo bậc + vùng thăng/giáng, không phải 1
  bảng metric đơn giản) để tránh phải sửa `components/leaderboard.tsx` đang được dev FE khác
  chỉnh song song.
- **Nhiệm vụ hàng ngày** (`src/modules/quests`, `QuestsService`, từ 2026-09-19) — mục tiêu
  chính là LIÊN KẾT các tính năng đang đứng riêng lẻ (user từng phản ánh app "quá nhiều chức
  năng rời rạc, không liên kết"): mỗi nhiệm vụ trong 3 nhiệm vụ/ngày lấy tiêu chí từ 1 tính năng
  KHÁC NHAU đã có sẵn — ôn từ vựng (`ReviewLog`), làm quiz (`QuizAttempt.completedAt`), luyện
  nghe đúng (`PracticeAttempt` skill LISTENING + `isCorrect: true`), luyện phát âm (cùng bảng,
  skill PRONUNCIATION — KHÔNG lọc `isCorrect: true` như listening vì phát âm chỉ tự chấm được
  trên Chrome/Edge qua Web Speech API, trình duyệt khác `isCorrect` luôn `null` nên lọc theo
  đúng/sai sẽ khiến nhiệm vụ KHÔNG BAO GIỜ hoàn thành được trên trình duyệt đó — tính theo lượt
  LUYỆN là đủ công bằng), và học từ mới (`ReviewLog` với `reviewType: 'LEARN'`). **Tiến độ tính
  TRỰC TIẾP (live) mỗi lần gọi `GET /quests/today`, KHÔNG lưu counter riêng** — giống hệt cách
  `LeagueService` tính điểm tuần, tránh lệch dữ liệu và không cần nghe sự kiện từ nhiều nơi dù
  các sự kiện `AppEvent.WordReviewed`/`QuizCompleted`/`PracticeAttempted` đã có sẵn. Chọn 3
  nhiệm vụ mỗi ngày bằng hash xác định (`selectDailyQuests()` trong `quest.util.ts`, seed =
  `userId:ngày`) — KHÔNG lưu DB, tính lại luôn ra đúng 3 nhiệm vụ giống hệt trong cùng 1 ngày mà
  không cần bảng lưu lựa chọn. Model `DailyQuestClaim` (unique `[userId, localDate, questKey]`)
  CHỈ để chống thưởng xu 2 lần cho cùng 1 nhiệm vụ — server tự cộng xu ngay lần đầu phát hiện
  nhiệm vụ đạt đủ target (không cần client gọi "nhận thưởng" riêng), dùng lại `WalletService.
  credit()` đã có sẵn (giống cơ chế điểm danh) nên KHÔNG phải quyết định sản phẩm mới về kinh tế
  xu. Thưởng thêm `ALL_DONE_BONUS_XU` (10 xu) khi xong cả 3, ghi nhận qua `questKey` đặc biệt
  `"all_done"`. Ngày tính theo timezone user + `STREAK_DAY_CUTOFF_HOUR` (dùng lại
  `startOfLocalDayInstant()`/`localStudyDate()` ở `time.util.ts`, đúng như streak/League).
  Client: `components/daily-quest-card.tsx` ở dashboard, cạnh thẻ Giải đấu tuần (lưới 2 cột
  Tailwind riêng trong `page.tsx`, KHÔNG dùng chung `.dailyGrid` có sẵn — cùng lý do tránh sửa
  CSS grid dùng chung với thẻ Giải đấu tuần).
  **Rủi ro nhỏ đã biết, CHẤP NHẬN không sửa** (phát hiện qua code review chủ động, quy mô hiện
  tại chưa đáng công sức sửa): `tryClaim()` tạo `DailyQuestClaim` (bản ghi DUY NHẤT xác nhận đã
  thưởng) TRƯỚC khi gọi `wallet.credit()` — nếu `credit()` lỗi đúng lúc ngay sau khi claim
  commit (vd lỗi DB tạm thời), nhiệm vụ bị đánh dấu đã nhận thưởng vĩnh viễn mà không có xu,
  không có đường thử lại. Khác hẳn rủi ro ở `PaymentsService`/`ShopService` (tiền thật/mua bán)
  — đây chỉ là vài xu nhỏ (5-8 xu) và cần đúng 1 lỗi DB xảy ra đúng khoảnh khắc hiếm, chấp nhận
  đánh đổi thay vì bọc `$transaction` phức tạp cho 1 tính năng phụ giá trị nhỏ.
- **Cửa hàng trang trí — khung avatar** (`src/modules/shop`, `ShopService`, `frame-catalog.ts`,
  từ 2026-09-19) — sink xu THỨ HAI sau lá chắn streak (300 xu): ví xu trước đó gần như không có
  gì đáng mua thêm dù đã có nhiều nguồn kiếm (điểm danh, minigame, nhiệm vụ hàng ngày). 4 khung
  avatar (Ngọc Bích 150 / Hoàng Kim 300 / Lửa Hồng 500 / Rồng Thiêng 800 xu), mua ĐỨT (không hết
  hạn) qua `POST /shop/frames/:key/buy`, chỉ được DÙNG (không nhất thiết đã mua) qua `POST
  /shop/frames/equip` (`frameKey: null` = gỡ khung). **CỐ Ý KHÔNG dùng cơ chế rương/random
  reward** dù đã cân nhắc — xu ở đây có thể nạp bằng tiền thật qua payOS (1 VNĐ = 1 xu), gắn may
  rủi vào tiền có thể quy đổi từ tiền thật sẽ mang màu sắc loot-box nhạy cảm về pháp lý/đạo đức;
  mua đứt xác định giá rõ ràng an toàn hơn nhiều. Model `UserFrame` (unique `[userId, frameKey]`)
  chỉ ghi nhận SỞ HỮU; khung ĐANG DÙNG lưu ở `UserSettings.equippedFrame` (field mới, giống chỗ
  `reminderHour`/`srsScheduler` đã có). Màu khung (`colors: [string,string]`, dùng vẽ viền
  gradient) LUÔN gửi từ server (catalog + hồ sơ công khai), client KHÔNG chép tay lại — giống
  đúng cách `LeagueTier.color` đã làm, tránh lệch màu khi catalog đổi sau này. `UsersService.
  getPublicProfile()` trả thêm `equippedFrame: {key, colors} | null` để `/u/[id]` hiện được khung
  của người khác. Client: `components/avatar.tsx` thêm prop `frameColors` HOÀN TOÀN tuỳ chọn
  (mặc định `null` = render y hệt trước đây, không đổi gì cho hàng chục nơi đang gọi `<Avatar>`
  mà chưa truyền prop này — cố ý viết lại sao cho nhánh không-khung giữ nguyên byte-for-byte
  logic cũ, tránh rủi ro layout ở những nơi dùng chung như bảng xếp hạng/tin nhắn/bình luận).
  `components/frame-shop.tsx` (`/account`, ngay dưới thẻ Ví xu) là nơi DUY NHẤT mua/đổi khung ở
  bản này — **CHƯA thread khung vào Avatar ở leaderboard/tin nhắn/bình luận** (cần API trả thêm
  field cho từng dòng ở nhiều endpoint khác nhau, để dành làm sau nếu tính năng được đón nhận
  tốt), hiện khung chỉ thấy được ở `/account` (xem trước) và hồ sơ công khai `/u/[id]`.
  **Lỗi thật đã phát hiện + sửa qua code review chủ động (2026-09-19)**: `ShopService.buy()`
  BAN ĐẦU trừ xu TRƯỚC rồi mới tạo `UserFrame` — 2 request mua trùng 1 khung chạy song song
  (bấm đúp/client tự retry) đều qua được kiểm tra "chưa sở hữu" TRƯỚC khi ai kịp tạo bản ghi,
  cả 2 đều trừ xu thành công nhưng chỉ 1 request tạo `UserFrame` thành công (bên còn lại dính
  lỗi unique constraint) — trừ oan 1 lần xu không hoàn lại. Sửa bằng cách ĐẢO THỨ TỰ: tạo
  `UserFrame` TRƯỚC (bắt lỗi P2002 → báo "đã sở hữu" thay vì trừ xu oan), CHỈ trừ xu SAU KHI
  tạo bản ghi thành công, và HOÀN TÁC (xoá) bản ghi vừa tạo nếu bước trừ xu thất bại (vd không
  đủ xu) — tránh phát sinh khung miễn phí. Đúng mẫu `QuestsService.tryClaim()` đã làm sẵn trong
  cùng đợt code này (tạo bản ghi dựa vào unique constraint TRƯỚC, thưởng SAU). Đã verify TRỰC
  TIẾP trên production cả 2 nhánh: mua thành công (168→18 xu, đúng 150) và mua lại khung đã sở
  hữu (báo lỗi rõ ràng, không trừ xu lần 2).
- **Danh hiệu (`title-catalog.ts`, `TitleService`, model `UserTitle`, từ 2026-09-19)** — sink xu
  THỨ BA (sau lá chắn streak + khung avatar), theo yêu cầu mở rộng "xu cần mua được nhiều thứ
  hơn". 6 danh hiệu (Chăm chỉ/Cú đêm 100 xu, Mọt sách/Ngôi sao mới nổi 200 xu, Bậc thầy từ vựng
  400 xu, Huyền thoại 800 xu) — hiện dạng CHỮ cạnh tên trên hồ sơ công khai, KHÁC khung avatar
  (viền quanh ảnh). CỐ TÌNH tách `TitleService` RIÊNG khỏi `ShopService` dù cơ chế mua/dùng
  giống hệt nhau (đã áp dụng ĐÚNG NGAY TỪ ĐẦU thứ tự tạo-trước-trừ-xu-sau đã sửa ở khung avatar,
  không lặp lại lỗi cũ) — không gộp thành 1 "cosmetic system" tổng quát vì mới có 2 loại vật
  phẩm, gộp sớm là abstraction thừa. `equippedTitle` lưu ở `UserSettings` (giống `equippedFrame`),
  `getPublicProfile()` trả thêm field này (chuỗi label, không phải object như frame vì không cần
  màu sắc gì thêm).
  **Quyền lợi Premium mới: NHÂN ĐÔI xu** (`PREMIUM_XU_MULTIPLIER = 2`, `applyPremiumMultiplier()`
  ở `premium-plans.ts`) — áp dụng cho xu kiếm từ minigame (`MinigameService.creditMinigameReward()`,
  dùng chung cho cả trắc nghiệm lẫn "Ghép cặp") và nhiệm vụ hàng ngày (`QuestsService.getToday()`'s
  `xuOf()` — nhân TRƯỚC khi hiển thị lẫn khi thưởng, tránh UI hiện số gốc rồi thực nhận nhiều hơn
  không giải thích được). KHÔNG áp dụng cho điểm danh hằng ngày (`DAILY_CHECKIN_REWARD`) — đó là
  thưởng thói quen cố định, không nên tăng theo hoạt động. Tạo vòng lặp giữ chân có chủ đích: mua
  Premium kiếm xu nhanh hơn → nhiều xu hơn để mua khung/danh hiệu mới → Premium càng đáng giá hơn
  khi có nhiều thứ để mua hơn.
- **Đấu đôi 2v2 — ĐÃ XOÁ (2026-09-22)**: từng có `TeamDuelService`/`TeamDuelController` +
  3 sự kiện WebSocket `teamduel:*`. Gỡ vì 0 người từng chơi, và quan trọng hơn: nó TÁCH HÀNG
  CHỜ GHÉP TRẬN LÀM ĐÔI — với lượng người chơi hiện tại thì cả 1v1 lẫn 2v2 đều khó ghép, gộp
  về một hàng chờ duy nhất có lợi thật chứ không chỉ gọn code. Không cần migration vì 2v2 vốn
  dùng chung `UserRating` và không lưu lịch sử trận riêng. Đấu 1v1, rank tier, mùa giải giữ
  nguyên. Nếu sau này muốn làm lại, xem lịch sử git trước commit "refactor(duel): xoá hẳn".
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

  **Đã sửa 2026-09-18** (audit chủ động phát hiện qua research, không phải user báo lỗi):
  (1) race condition thật — trước đây chỉ nút "Dịch" bị disable lúc đang dịch, ô nhập + nút Gửi
  vẫn bấm được bình thường, nên bấm Gửi giữa lúc đang dịch sẽ gửi bản CHƯA dịch, rồi bản dịch
  trả về SAU đó ghi đè lung tung vào ô nhập đã bị xoá — giờ ô nhập + nút Gửi đều disable khi
  `translating`, và `send()`/`translateInput()` đều tự chặn lẫn nhau qua điều kiện đầu hàm;
  (2) `translateSimple()` giờ áp `decodeTerms()` dọn kết quả (bỏ thẻ HTML lạc/khoảng trắng
  thừa) giống `translateLinesToVi()`, trước đó bỏ sót bước này; (3) lỗi trong
  `translateForCompose()` giờ có log (`this.logger.warn`) thay vì nuốt lỗi im lặng.
  **`googleDead` sửa thành cooldown 10 phút** (`videos/translate.util.ts`, ảnh hưởng CHUNG cả
  dịch video lẫn dịch nhắn tin vì dùng chung `callGoogle()`) — trước đây 1 lần Google bị chặn IP
  là tắt VĨNH VIỄN tới khi restart server, dồn hết lưu lượng sang MyMemory (hạn mức ngày thấp
  hơn nhiều) một cách không cần thiết nếu lỗi chỉ tạm thời.

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
  **`POST /onboarding/preview` (`@Public()`, từ 2026-09-22)** — tính đúng lộ trình như `submit()`
  nhưng KHÔNG lưu và KHÔNG cần đăng nhập. Khảo sát vốn thiết kế để làm TRƯỚC khi có tài khoản
  (kiểu "gradual engagement" của Duolingo), nhưng trước đó trả lời xong 3 câu là bị đẩy thẳng
  sang `/register` mới được xem kết quả — bỏ công ra mà chưa nhận lại gì, đúng chỗ dễ rời đi
  nhất trong cả luồng. `buildRecommendation()` vì vậy nhận `userId: string | null`; thiếu
  `UserSettings` thì rơi về nhịp mặc định 20 từ/ngày.
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
  **Hạn mức/ngày cho user miễn phí** (`checkDailyAskQuota()`, từ 2026-09-19 — xem mục Premium):
  đã giải quyết đúng TODO(scale) từng ghi ở đây (throttle cũ chỉ chặn spam 1 user, CHƯA bảo vệ
  quota Gemini free tier CHUNG khi nhiều user thật cùng dùng) — free giới hạn
  `FREE_ASK_DAILY_LIMIT` (15) lượt/ngày, Premium không giới hạn. Vẫn còn phương án (1) nâng gói
  Gemini trả phí nếu quota CHUNG vẫn hết dù đã giới hạn từng user — cân nhắc sau khi quan sát
  mức dùng thật. **Để trống
  `GEMINI_API_KEY` thì toàn bộ tự
  báo "chưa bật", không chặn app khởi động** — cần thêm `GEMINI_API_KEY` (+ `AI_SYSTEM_PROMPT`
  tuỳ chọn) vào `.env`/`.env.production.local` (đã có sẵn ở máy dev, cần copy tay lên VPS).
  **"AI Agent" — tool-calling (`TOOLS`, `executeTool()`)**: trợ lý gọi được 2 tool Gemini
  function-calling — `navigate_to_page` (19 trang tĩnh, `PAGE_PATHS`/`PAGE_LABELS_VI` — gồm cả
  `flashcard` "ôn flashcard" và `account` "đổi mật khẩu", tuỳ chọn
  `level` cho `learn`/`vocabulary`) và `open_video` (tìm `Video` theo `title`/`titleZh` chứa từ
  khoá). Cả 2 tool đều CHỈ ĐỌC dữ liệu và trả về 1 đường dẫn — không có tool nào tự đổi dữ liệu
  **Bỏ sót trang trong `PAGE_PATHS` = tính năng đó tàng hình với trợ lý** — 2026-09-22 phát hiện
  thiếu hẳn `roleplay`, `minigame`, `messages`, nên hỏi "luyện nói ở đâu" là model không có
  đường nào để trỏ; đúng lúc đo thấy trợ lý AI là thứ ĐƯỢC DÙNG NHIỀU NHẤT (150 tin nhắn, hơn
  cả số lượt ôn từ) còn roleplay mới 5 tin nhắn, minigame 30 ván. `grammar` cũng còn trỏ
  `/grammar` (đã gộp vào `/ngu-phap`, chỉ còn redirect 308). Thêm trang mới vào app thì nhớ khai
  ở CẢ `PAGE_PATHS` lẫn `PAGE_LABELS_VI` và nhắc tên trong description của tool.
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
- **Luyện nói với AI theo tình huống (`src/modules/roleplay`, `RoleplayService`, từ
  2026-09-19)** — mục roadmap "chưa làm" đã ghi từ lâu: hội thoại luyện nói kiểu Duolingo Video
  Call/Roleplay, KHÁC HẲN trợ lý AI hỏi-đáp ở trên (đó là tra cứu, đây là bài tập PHẢN XẠ đóng
  vai). 6 tình huống đời thường xếp theo độ khó tăng dần HSK1→HSK4 (`roleplay-scenarios.ts`):
  làm quen bạn mới, gọi món nhà hàng, hỏi đường, mua sắm, đặt phòng khách sạn, khám bệnh — mỗi
  tình huống có `systemPrompt` (persona + yêu cầu CHỈ trả lời tiếng Trung, câu ngắn, giữ vai
  xuyên suốt, không giải thích ngữ pháp/dịch nghĩa giữa chừng) và `openingLineZh` CỐ ĐỊNH (không
  gọi Gemini để mở đầu — vào là có câu chào ngay, luôn đúng giọng văn mong muốn). Model dùng
  `config: { systemInstruction }` của Gemini (tách biệt persona khỏi nội dung hội thoại, khác
  cách trợ lý hỏi-đáp nhét prompt vào lượt `user` đầu) + `CHAT_MODELS` — TÁCH RA
  `assistant/gemini-models.ts` dùng CHUNG với `AssistantService` (trước đó là field private
  riêng, tách ra để 2 module không lệch danh sách model theo thời gian).
  **Model RIÊNG** `RoleplaySession`/`RoleplayMessage` (không dùng chung `ChatSession`/
  `ChatMessage` của trợ lý) — hội thoại đóng vai không nên trộn vào lịch sử hỏi-đáp.
  `RoleplayMessage.pinyin` sinh SẴN lúc lưu (bằng `pinyin-pro`, cùng cách `MessagesService`/
  video transcript đã làm) cho tin nhắn MODEL — người học thấy pinyin ngay dưới câu tiếng Trung
  của AI, không cần bấm dịch riêng. **Hạn mức/ngày riêng** (`FREE_ASK_DAILY_LIMIT`-tương-tự,
  `FREE_ROLEPLAY_DAILY_LIMIT` = 15) — đếm ĐỘC LẬP với trợ lý hỏi-đáp dù dùng chung quota Gemini,
  đơn giản hoá thay vì gộp 2 bộ đếm; Premium bỏ qua hoàn toàn, đúng nhất quán với quyết định
  "Premium mở tiện ích AI không giới hạn" đã áp dụng cho trợ lý hỏi-đáp — đây là MỞ RỘNG tự
  nhiên của quyết định cũ (cùng loại quyền lợi, áp dụng thêm cho tính năng AI mới), không phải
  quyết định giá/phạm vi MỚI cần hỏi lại. Client: `/roleplay` — màn chọn tình huống (lưới thẻ +
  danh sách hội thoại gần đây) và màn chat (bong bóng tin nhắn, pinyin hiện dưới câu AI, gửi tin
  nhắn optimistic-update qua `mutate()` của SWR). Thêm mục "Luyện nói với AI" vào
  `components/sidebar.tsx` (nhóm "LUYỆN TẬP MỖI NGÀY").
  **Gợi ý câu trả lời** (`POST /roleplay/sessions/:id/hint`, `RoleplayService.hint()`, từ
  2026-09-19) — giải quyết mục "chưa làm" ghi ngay lúc mới xong tính năng: người học bí từ giữa
  chừng thì bấm nút gợi ý (icon `spark` cạnh ô nhập) thay vì bế tắc rồi thoát. Dùng prompt RIÊNG
  (`buildHintPrompt()`, khác `buildSystemPrompt()` ở trên) — nhờ Gemini đứng NGOÀI vai diễn, gợi
  ý câu NGƯỜI HỌC (không phải đối phương) có thể nói tiếp, kèm nghĩa tiếng Việt. Yêu cầu Gemini
  trả đúng format 2 dòng cố định (`中文：`/`Nghĩa：`) để parse đơn giản bằng regex thay vì cấu
  hình `responseSchema` JSON của Gemini (đơn giản hoá — parse lỗi thì rơi về coi cả đoạn là câu
  gợi ý, bỏ trống nghĩa, không throw lỗi cho 1 tính năng phụ). **KHÔNG lưu gợi ý vào lịch sử hội
  thoại** (`RoleplayMessage`) — chỉ là gợi ý tạm, không phải lượt nói thật; dùng lại CHÍNH
  `checkDailyQuota()` của `reply()` (đã hết hạn mức/ngày thì gợi ý cũng bị chặn) thay vì dựng bộ
  đếm riêng — chấp nhận đánh đổi là spam gợi ý không tự làm hết hạn mức nhanh hơn (quy mô nhỏ,
  chưa đáng lo). Client: bấm "Dùng câu này" điền thẳng gợi ý vào ô nhập để người học TỰ xem/sửa
  trước khi gửi (không tự động gửi luôn), giống đúng tinh thần nút "Dịch" ở `/messages`.
  **Nhận xét cuối buổi** (`POST /roleplay/sessions/:id/feedback`, `RoleplayService.feedback()`,
  từ 2026-09-22) — đúng mục "chưa làm" ghi ngay lúc xong tính năng: trước đó bấm "Kết thúc" là
  hội thoại bị xoá ngay, luyện xong không biết mình sai chỗ nào, trong khi `/listening` và
  `/pronunciation` đều đã có phần "kết quả buổi luyện". `buildFeedbackPrompt()` cho Gemini đứng
  NGOÀI vai diễn, nhận xét bằng TIẾNG VIỆT và CHỈ phần người học nói, theo khuôn cố định (**Làm
  tốt** / **Nên sửa** dạng "câu đã viết → câu nên viết — lý do" / **Lần sau thử** 1 câu) giới hạn
  ~120 từ — nhận xét chung chung kiểu "cần cố gắng hơn" thì vô dụng, mà giảng ngữ pháp dài thì
  hỏng mục đích luyện phản xạ. **Chưa nói câu nào thì trả lời thẳng, KHÔNG gọi Gemini** (không
  đốt quota để model tự bịa nhận xét). **KHÔNG lưu DB**: hội thoại đóng vai vốn bị xoá khi kết
  thúc nên lưu riêng nhận xét sẽ thành dữ liệu mồ côi. Đọc tối đa `FEEDBACK_HISTORY_LIMIT` (40)
  lượt — nhiều hơn `HISTORY_LIMIT` (20) của `reply()` vì cần nhìn cả buổi, nhưng vẫn có trần.
  Dùng chung hạn mức/ngày với `reply()`/`hint()`. Client: bấm "Kết thúc" hiện màn kết quả rồi
  mới chọn "Đóng buổi luyện" (xoá) hay "Nói tiếp"; AI lỗi thì KHÔNG chặn đường thoát.
  **Rủi ro nhỏ đã biết, CHẤP NHẬN không sửa**: `checkDailyQuota()` đếm `RoleplayMessage` hiện
  có rồi so với `FREE_ROLEPLAY_DAILY_LIMIT` TRƯỚC khi lưu lượt hiện tại — nhiều request gửi dồn
  dập/đồng thời gần chạm hạn mức đều đọc cùng số đếm cũ, có thể vượt hạn mức vài lượt gọi
  Gemini. Không lộ ra ngoài tiền thật/xu (chỉ ảnh hưởng quota Gemini free tier dùng chung), và
  cần đúng kiểu tấn công dồn dập bất thường mới khai thác được — chấp nhận đánh đổi thay vì
  khoá tầng ứng dụng phức tạp cho 1 tình huống hiếm ở quy mô hiện tại (`AssistantService.
  checkDailyAskQuota()` có cùng đặc điểm y hệt).

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

**Bấm từ trong bản chép video để xem nghĩa + lưu vào SRS** (`word-match.util.ts`, từ 2026-09-18)
— research đối chiếu các app học tiếng Trung qua video mạnh nhất thị trường (Dong Chinese,
FluentU, Migaku, Language Reactor...) xác nhận đây là tính năng gần như BẮT BUỘC phải có,
Hanni trước đó chỉ cho xem/nghe chứ không tra được nghĩa từng từ ngay tại chỗ. `GET
/videos/:id` giờ trả thêm `tokens` cho mỗi `VideoLine` — tách câu thành từ khớp CHÍNH XÁC với
`Word` (khớp dài nhất trước, tối đa 6 ký tự — KHÔNG dùng `pinyin-pro`'s `segment()` vì mỗi đoạn
khớp cần trỏ thẳng tới 1 dòng từ điển thật có nghĩa tiếng Việt, không phải chỉ tách âm tiết) và
đoạn không khớp (giữ nguyên, không bấm được). Bảng từ (10.912 dòng) cache trong tiến trình 1
giờ (`VideosService.getWordIndex()`) — không build lại mỗi request, không cần Redis vì bảng từ
hiếm khi đổi.
**Lưu từ vào SRS mà KHÔNG qua review()** (`POST /study/add-word`, `ReviewService.addWord()`) —
tạo thẳng `UserWordProgress` ở `state: LEARNING` (KHÔNG phải `NEW` — `NEW` trong hệ SRS này là
ẢO, nghĩa là "chưa có dòng nào" chứ không phải 1 giá trị lưu thật, xem `getQueue()`'s `newRows`
lọc theo `progress: {none}`) với `dueAt` = ngay bây giờ + field mặc định giống hệt trạng thái
trước lần review đầu tiên — để từ xuất hiện ngay trong `dueRows` của `getQueue()` ở lượt gọi
tiếp theo, KHÔNG cần sửa `getQueue()`/`newRows` (vốn chỉ quét theo lessonId/hskLevel chứ không
theo từ người dùng tự chọn tuỳ ý). Đánh đổi đã cân nhắc: lần review ĐẦU TIÊN của từ này sẽ tính
`reviewType: REVIEW` thay vì `LEARN` (vì `before.state` không phải `NEW`) — sai lệch nhỏ trong
thống kê "số từ mới học hôm nay", chấp nhận được để đổi lấy việc không đụng vào logic
`getQueue()`/`review()` dùng chung cho toàn bộ SRS. Idempotent — từ đã có tiến độ (bất kỳ
state nào) thì bỏ qua, không ghi đè.

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
— trang `/grammar` đọc 2 param này qua `useSearchParams()` thật (bọc `<Suspense>`) + `key`
trên component con để ép remount mỗi khi đổi param, tự mở đúng điểm ngữ pháp đó. Lúc đầu dùng
lazy initializer (`useState(() => window.location.search...)`) để né `<Suspense>`, nhưng
`/grammar` được vào chủ yếu bằng `<Link>` từ `/learn/[lessonId]` (client-side navigation) —
Next.js có thể tái dùng instance component cũ khi chỉ đổi query string nên lazy initializer
không đọc lại được param mới (bug thật, phát hiện bằng Playwright test click Link — xem
`hanni-client/CLAUDE.md` mục Convention).

**Luyện tập gắn theo bài học** (cùng đợt trên): trước đây `/listening`/`/pronunciation` chỉ
cho chọn cấp HSK rồi luyện ngẫu nhiên TOÀN BỘ từ của cấp đó, không liên quan gì tới bài đang
học. `GET /words` giờ nhận thêm `lessonId` (query, `WordQueryDto`) — lọc đúng từ của 1 bài học,
tự đổi `orderBy` sang `lessonOrder` thay vì `frequencyRank` khi có `lessonId`. Client:
`/learn/[lessonId]` có 2 nút "Luyện nghe"/"Luyện phát âm" → `/listening?lesson=<id>` (component
dùng chung `PracticeLibrary` nhận prop `lessonId`, tự ẩn phần chọn cấp độ và tự fetch tên bài
qua `useLesson()` khi có `lessonId`, có link "luyện tự do theo cấp độ" để thoát ra). `/writing`
KHÔNG dùng chung cơ chế này (đọc file tĩnh `hanzi-strokes/index.json` theo ký tự, không có khái
niệm lessonId). **Đã làm 2026-09-22**: `/writing` mặc định lọc theo các chữ có trong từ vựng
của bài đang học (`GET /learn/current` + `/learn/lessons/:id`), đổi sang toàn bộ cấp được bằng
1 nút — xem `hanni-client/CLAUDE.md`.

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
nghe/đọc trộn vào quiz từ vựng, chưa đúng cấu trúc thật), ngữ pháp dẫn dắt theo bài học. Hội
thoại luyện nói với AI theo tình huống ĐÃ LÀM (`src/modules/roleplay`, xem mục riêng ở trên).
Xem FEATURES.md mục 10 cho phân tích đầy đủ + chiến lược tăng trưởng.
