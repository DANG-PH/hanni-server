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
npx prisma generate
npx prisma migrate deploy       # áp toàn bộ migration, bao gồm push_subscriptions
npm run db:seed                 # một lần duy nhất — KHÔNG nằm trong CI/CD, không tự chạy lại mỗi lần deploy
npm run build

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

Sau bước này, mọi push lên `main` sẽ tự động: lint + build (job `ci`) → SSH vào VPS → `git reset --hard
origin/main` → `npm ci` → `prisma generate` → `prisma migrate deploy` → `npm run build` →
`pm2 restart all --update-env`. Không cần lặp lại các bước thủ công ở trên.

## Domain backend: đang chuyển từ `api.hanni.dangpham.id.vn` sang `hanni-api.dangpham.id.vn`

`api.hanni.dangpham.id.vn` (2 cấp con: `api` + `hanni`) không bao giờ hoạt động được vì
chứng chỉ Universal SSL miễn phí của Cloudflare chỉ phủ apex + wildcard **1 cấp**
(`*.dangpham.id.vn`), không phủ hostname 2 cấp — Cloudflare từ chối bắt tay TLS ngay ở edge,
chưa từng chạm tới origin (đã verify: SSH thẳng vào VPS, `curl` từ chính VPS ra domain đó vẫn lỗi
y hệt → không phải do nginx/deploy). Cách sửa miễn phí duy nhất là đổi sang hostname 1 cấp —
`hanni-api.dangpham.id.vn`, khớp đúng kiểu `book-api`, `profile-api` các service khác đang dùng.
(Cách còn lại là mua Advanced Certificate Manager của Cloudflare, $10/tháng/zone — không chọn.)

Trạng thái chuyển đổi:
- [x] DNS record `hanni-api` → `103.116.52.198`, Proxied — đã thêm trên Cloudflare.
- [x] `nginx.conf` (repo `nginx-service`) đã sửa `server_name` sang `hanni-api.dangpham.id.vn` —
      **chưa push**, đang chờ cert xong (bước dưới) để tránh nginx phục vụ domain mới bằng cert
      chưa kịp phủ.
- [ ] **Cần bạn tự chạy trên VPS1** (lệnh `docker stop nginx` bị chặn bởi lớp an toàn tự động,
      Claude không tự chạy được) — SSH vào rồi chạy:
      ```bash
      docker stop nginx
      certbot certonly --standalone --non-interactive --expand --cert-name api.ngocrongdark.com \
        -d api.ngocrongdark.com -d api.dangpham.id.vn -d hanni-api.dangpham.id.vn \
        -d book-api.dangpham.id.vn -d data.dangpham.id.vn -d data.ngocrongdark.com \
        -d download.ngocrongdark.com -d grafana.ngocrongdark.com -d pay.dangpham.id.vn \
        -d pay.ngocrongdark.com -d postgres.dangpham.id.vn -d postgres.ngocrongdark.com \
        -d profile-api.dangpham.id.vn -d redis.dangpham.id.vn -d redis.ngocrongdark.com \
        -d ws-go.dangpham.id.vn -d ws.dangpham.id.vn
      chmod -R 755 /etc/letsencrypt/live /etc/letsencrypt/archive
      docker start nginx
      ```
      Gián đoạn ngắn (vài giây) cho MỌI domain qua nginx này, không chỉ Hanni — vì cert/nginx dùng
      chung. Danh sách domain này bỏ `api.hanni.dangpham.id.vn` ra khỏi cert (đang thay thế).
- [ ] Sau khi cert xong: push `nginx.conf` đã sửa sẵn ở repo `nginx-service` (kích hoạt CI/CD →
      `dragonboy-devops-service` → `docker compose up -d --force-recreate nginx` trên VPS1).
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
