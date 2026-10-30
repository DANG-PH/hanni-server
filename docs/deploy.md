# Triển khai hanni-server lên VPS

## Lần đầu (thủ công — chỉ làm 1 lần)

CI/CD (`.github/workflows/deploy.yml`) chỉ `git reset --hard` + build + `pm2 restart all` —
nó **không** clone repo lần đầu, không tạo `.env`, không dựng Postgres/Redis, và không đăng ký
tiến trình với PM2. Các bước dưới đây làm đúng 1 lần cho một VPS mới.

```bash
git clone https://github.com/DANG-PH/hanni-server.git <VPS_APP_PATH>
cd <VPS_APP_PATH>
# <VPS_APP_PATH> phải khớp chính xác biến VPS_APP_PATH trong GitHub Secrets,
# vì mỗi lần deploy sau CI sẽ `cd` vào đúng đường dẫn đó.

# Dán nội dung .env.production.local (tạo sẵn ở máy dev, không commit) vào đây thành .env
nano .env
chmod 600 .env

docker compose up -d
# Postgres :2222 + Redis :2223 theo docker-compose.yml có sẵn trong repo.
# Bỏ qua nếu VPS đã có Postgres/Redis riêng — nhớ sửa DATABASE_URL/REDIS_URL trong .env cho khớp.

npm ci
npm run build
node dist/src/database/migrate.js   # tạo toàn bộ bảng (migration TypeORM)
npm run db:seed                     # một lần duy nhất — KHÔNG nằm trong CI/CD, không tự chạy lại mỗi lần deploy

npm i -g pm2                    # nếu VPS chưa có
pm2 start dist/src/main.js --name hanni-server
pm2 save
pm2 startup                     # copy lệnh in ra và chạy — để PM2 tự khởi động lại sau khi VPS reboot
```

Kiểm tra:

```bash
pm2 logs hanni-server --lines 50
curl http://localhost:8000/api/health
```

**Đã hoàn tất trên VPS1** (`103.116.52.198`, cùng máy với `nginx-service`, hostname `kien22`) —
`hanni-server` chạy chung PM2 với `bookshelf-server`, `profile-backend`. `curl localhost:8000/api/health`
trả `{"status":"ok","db":"up","redis":"up"}`.

**CI/CD đã verify chạy thật lần đầu tiên** (trước đó 3/3 lần chạy đều fail ở bước lint — xem lịch
sử commit `e63c860`, sửa 6 lỗi type thật + để `npm run lint --fix` dọn định dạng phần còn lại).
Sau khi sửa `VPS_APP_PATH` (từng để trống, khiến bước SSH `cd ""` ra `/root` không phải repo),
một push thật lên `main` đã chạy trọn `ci` → `deploy` → health check trả `ok`.

Sau bước này, mọi push lên `main` sẽ tự động: lint + test + build trên runner GitHub (job `ci`) → chép
`dist/` sang VPS → `git reset --hard origin/main` → `npm install` (chỉ khi package-lock đổi) →
`node dist/src/database/migrate.js` (migration TypeORM) → `pm2 restart hanni-server --update-env` → chờ
`/api/health`. Không cần lặp lại các bước thủ công ở trên.

## Audience Google cho ứng dụng Hanni mobile

`POST /api/auth/google` dùng chung cho web và mobile, body `{ "idToken": "..." }`.
Server kiểm chữ ký, issuer, thời hạn và audience bằng `google-auth-library`; token không hợp lệ trả HTTP 401.

Giữ `GOOGLE_CLIENT_ID` hiện tại của web Hanni. Thêm dòng sau vào `.env` **trên VPS**:

```dotenv
GOOGLE_MOBILE_CLIENT_IDS=977963570920-h0qat6jqr0j309m1326blhmu7516g0rj.apps.googleusercontent.com
```

Đây là OAuth client loại Web application dùng làm server client ID của Android, bằng
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` trong app. Không dùng Desktop client ID của game.
Nhiều audience mobile (ví dụ thêm iOS) phân tách bằng dấu phẩy. Sau khi deploy code, chạy
`pm2 restart hanni-server --update-env`. File `.env.production.local` trên máy dev chỉ là bản cấu hình để copy;
CI không tự đồng bộ các biến này lên VPS.

Google Cloud còn cần client loại Android trong cùng project, khai package `com.hanni.app` + SHA-1 đúng khóa ký
APK. Xem `hanni-mobile/.env.example` và README mobile để cấu hình EAS và kiểm thử trên thiết bị.

## Domain backend: đang chuyển từ `api.hanni.dangpham.id.vn` sang `hanni-api.dangpham.id.vn`

`api.hanni.dangpham.id.vn` (2 cấp con: `api` + `hanni`) không bao giờ hoạt động được vì
chứng chỉ Universal SSL miễn phí của Cloudflare chỉ phủ apex + wildcard **1 cấp**
(`*.dangpham.id.vn`), không phủ hostname 2 cấp — Cloudflare từ chối bắt tay TLS ngay ở edge,
chưa từng chạm tới origin (đã verify: SSH thẳng vào VPS, `curl` từ chính VPS ra domain đó vẫn lỗi
y hệt → không phải do nginx/deploy). Cách sửa miễn phí duy nhất là đổi sang hostname 1 cấp —
`hanni-api.dangpham.id.vn`, khớp đúng kiểu `book-api`, `profile-api` các service khác đang dùng.
(Cách còn lại là mua Advanced Certificate Manager của Cloudflare, $10/tháng/zone — không chọn.)

Trạng thái chuyển đổi — **đã xong, đã verify end-to-end**:
- [x] DNS record `hanni-api` → `103.116.52.198`, Proxied — đã thêm trên Cloudflare.
- [x] Cert Let's Encrypt (`api.ngocrongdark.com`, dùng chung) đã `--expand` thêm
      `hanni-api.dangpham.id.vn`, bỏ `api.hanni.dangpham.id.vn` ra.
- [x] `nginx.conf` (repo `nginx-service`, commit `3f71f0e`) đã sửa `server_name` sang
      `hanni-api.dangpham.id.vn`, đã push và deploy thành công qua CI/CD.
- [x] Verify: `curl https://hanni-api.dangpham.id.vn/api/health` → `{"status":"ok","db":"up","redis":"up"}`,
      TLS hợp lệ (`openssl s_client` → `Verify return code: 0 (ok)`).
- [ ] Đổi `hanni-server/.env` trên VPS: `APP_URL=https://hanni-api.dangpham.id.vn` (đã sửa sẵn
      trong `.env.production.local` local — copy lại dòng đó lên VPS; không bắt buộc, `APP_URL`
      hiện chỉ dùng để validate, không ảnh hưởng runtime, nhưng nên khớp cho đúng).
- [ ] `NEXT_PUBLIC_API_URL=https://hanni-api.dangpham.id.vn/api` — bạn tự cập nhật trên Vercel.

## Việc cần làm tiếp theo (checklist)

- [ ] **hanni-client trên Vercel**: dán nội dung `hanni-client/.env.production.local` (đã cập nhật
      domain mới) vào Vercel Dashboard → Project → Settings → Environment Variables (môi trường
      Production). Vercel **không** tự đọc file `.env.production.local` trong repo.
- [ ] **Google Cloud Console**: thêm `https://hanni.dangpham.id.vn` vào "Authorized JavaScript
      origins" của OAuth client (giữ nguyên `http://localhost:3000` cho dev) — không liên quan tới
      việc đổi domain backend ở trên, vì đây là origin của **frontend**.

## Vì sao không dùng workflow CI/CD chung của `nginx-service`

`hanni-server` không dùng `dragonboy-devops-service` (repo devops trung tâm của hệ NRO) mà tự SSH
thẳng vào VPS trong `.github/workflows/deploy.yml` — vì `hanni-server` là dự án riêng, không nằm
trong `services.list` của hệ đó. `nginx-service` (dùng chung nginx cho cả NRO lẫn các side-project
như Hanni) thì có dùng `dragonboy-devops-service` — dispatch payload đã từng bị lỗi JSON (commit
message nhiều dòng làm vỡ JSON tay), đã sửa bằng `jq` ở cả `nginx-service` lẫn
`dragonboy-devops-service` (bước Notify Discord cũng bị lỗi y hệt).
