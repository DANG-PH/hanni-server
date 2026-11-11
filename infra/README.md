# Lab k3s của Hanni

Cụm Kubernetes 2 node chạy trong Docker để đo tải và thử mở rộng. Không dùng trên production: VPS vẫn chạy pm2.
Toàn bộ dữ liệu là dữ liệu giả, không nạp bản dump production vào đây.

## Cần có

Chỉ cần Docker, Docker Compose v2, `make`, `bash`, `curl`, còn trống từ 3 GB RAM, 8 GB đĩa. Mọi thứ khác chạy trong
container: k3s, `kubectl` (gọi qua `infra/scripts/kubectl`), Grafana, Prometheus, Loki, Jaeger, k6, ffmpeg. Không cài gì
thêm lên máy. Windows dùng qua WSL 2.

## Dựng lần đầu

```bash
cd infra
make up              # tạo học liệu mẫu, bật 2 node, sinh mật khẩu ngẫu nhiên
make images          # build image API + tools, nạp vào 2 node
make deploy          # Postgres, PgBouncer, Redis, API, worker, Nginx học liệu, HPA, NetworkPolicy
make seed            # migrate, seed từ vựng, 1.000 tài khoản giả, ghi phiên ra k6/tokens.json
make observability   # Prometheus, Alertmanager, Grafana, Loki, Alloy, Jaeger
make status
```

Tạm dừng cho nhẹ máy: `make stop`, `make start`. Xoá sạch: `make down`.

## Địa chỉ

| Dịch vụ | Địa chỉ |
| --- | --- |
| API | http://api.hanni.localhost:18080/api/health |
| Grafana | http://grafana.hanni.localhost:18080 (tài khoản `admin`) |
| Prometheus | http://prometheus.hanni.localhost:18080 |
| Alertmanager | http://alertmanager.hanni.localhost:18080 |
| Jaeger | http://jaeger.hanni.localhost:18080 |

Web chạy riêng, nối vào API lab, mở ở `http://hanni.localhost:3000` (không dùng `localhost`, trình duyệt sẽ không nhận cookie đăng nhập vì khác site với API):

```bash
cd hanni-client
NEXT_PUBLIC_API_URL=http://api.hanni.localhost:18080/api npx next dev -H hanni.localhost -p 3000
```

Mật khẩu Grafana:

```bash
scripts/kubectl -n observability get secret grafana-admin -o jsonpath='{.data.password}' | base64 -d
```

## Sửa nhanh khi bảo vệ

Lúc bảo vệ, mỗi người có thể được yêu cầu đổi 1 thông số rồi chạy lại. Mọi lệnh chạy trong `hanni-server/infra`.
Quy tắc chung: sửa tệp, chạy `make deploy` để nạp lại cấu hình; nếu sửa `k8s/app/config.yaml` hoặc `k8s/media-manifest.json`
thì chạy thêm `scripts/kubectl -n hanni rollout restart deployment/hanni-api` vì API chỉ đọc 2 tệp này lúc khởi động.

| Người | Muốn đổi | Sửa ở đâu | Kiểm tra lại |
| --- | --- | --- | --- |
| Đăng | Số bản API tối thiểu, tối đa; ngưỡng CPU để thêm bản | `k8s/app/api.yaml`: `minReplicas`, `maxReplicas`, `averageUtilization` | `scripts/kubectl -n hanni get hpa` |
| Đăng | CPU, RAM cho mỗi bản API | `k8s/app/api.yaml`: `resources.requests`, `resources.limits` | `scripts/kubectl -n hanni get pods` (pod tự tạo lại) |
| Đăng | Ngưỡng báo "thử lại sau" khi quá tải (0 là tắt) | `k8s/app/config.yaml`: `SHED_POOL_WAITING`, `SHED_LOOP_LAG_MS` | Tăng tải bằng `scripts/k6.sh tang-dan.js`, xem tỉ lệ mã 503 |
| Đăng | Số request tối đa mỗi tài khoản trong 1 phút | `k8s/app/config.yaml`: `THROTTLE_LIMIT`, `THROTTLE_TTL` | Gọi liên tục 1 route, vượt ngưỡng thì nhận mã 429 |
| Thành | Thêm 1 học liệu | Chép tệp vào `media/out/<thư mục>/`, thêm 1 mục vào `k8s/media-manifest.json` (id, title, kind, dir, file, bytes, requiresLogin) | Mở `http://hanni.localhost:3000/hoc-lieu`, có thẻ mới |
| Thành | Học liệu cần hay không cần đăng nhập | `k8s/media-manifest.json`: `requiresLogin` | Mở trang khi chưa đăng nhập: được mời đăng nhập hoặc mở được ngay |
| Thành | Thời hạn liên kết tải học liệu | `k8s/app/config.yaml`: `RESOURCE_LINK_TTL_SEC` (giây) | Xin liên kết, chờ quá hạn rồi mở lại: nhận mã 410 |
| Thành | Bitrate video 540p, 720p | `media/make-sample.sh`: dòng `540p:960x540:2000k 720p:1280x720:3000k` | Xoá `media/out/video-mau`, chạy `make sample`, xem dung lượng tệp |
| Vân Anh | Mức tải, thời gian đo | Tham số lệnh, ví dụ `scripts/k6.sh kb1-tu-hoc.js -e RATE=4 -e DURATION=5m` | Đọc p95, tỉ lệ lỗi ở cuối kết quả k6 |
| Vân Anh | 3 mức của Kiểm thử 2, số lần mỗi mức | Tham số lệnh `scripts/chay-kt2.sh k6/ket-qua/kt2 "10 24 36" 3` | Thư mục kết quả mỗi lần có `dieu-kien.txt` |
| Vân Anh | Tiêu chí đạt (p95 đọc, p95 ghi, lỗi) | `k6/lib.js`: `SLO_THRESHOLDS` | k6 thoát mã khác 0 khi không đạt |
| Đức | Giờ sao lưu hằng ngày | `k8s/backup/cronjob.yaml`: `schedule` (giờ UTC, `0 19 * * *` là 02:00 giờ Việt Nam) | `scripts/kubectl -n hanni get cronjob` |
| Đức | Số bản sao lưu giữ lại | `k8s/backup/cronjob.yaml`: `BACKUP_KEEP` | Chạy sao lưu tay vài lần, đếm tệp trong thư mục sao lưu |
| Đức | Sao lưu ngay, khôi phục ngay | `scripts/kubectl -n hanni create job --from=cronjob/hanni-backup sao-luu-tay`, rồi `scripts/restore.sh` | `restore.sh` in số dòng trước và sau, phải khớp |
| Đức | Ngưỡng và thời gian chờ của cảnh báo | `observability/rules/hanni-slo.yml`: dòng `expr`, `for` | Chạy `make observability`, rồi `scripts/kubectl -n observability rollout restart deployment/prometheus`; xem trang Alertmanager |
| Đức | Ai được kết nối tới CSDL, Redis | `k8s/policy/network-policy.yaml` | Chạy `scripts/kiem-quyen.sh`: ca kết nối thẳng CSDL phải bị chặn |

## Đo tải

k6 chạy trong Docker, chỉ nhận địa chỉ lab. Kết quả tóm tắt ghi vào `k6/ket-qua/`.

```bash
scripts/k6.sh kb1-tu-hoc.js -e RATE=4 -e DURATION=5m     # tự học, RATE là lượt mở bài mỗi giây
scripts/k6.sh kb2-video.js -e VIEWERS=60                 # cả lớp xem video
scripts/k6.sh kb3-thi-thu.js -e USERS=600                # mở đề 60 giây, nộp bài 30 giây
scripts/k6.sh tang-dan.js -e MAX_RATE=30                 # tăng dần để tìm điểm gãy và xem HPA thêm bản
scripts/k6.sh tang-dan.js -e MAX_RATE=200 -e STEP=12s -e HOLD=60s -e MAX_VUS=300 --no-thresholds   # giữ tải trên điểm gãy, xem có sập không
k6/thu-tai-nguyen.sh k6/ket-qua/lan1.csv                 # chạy song song, ghi CPU, RAM, số bản mỗi 5 giây
```

## Diễn tập sự cố

```bash
scripts/do-gian-doan.sh k6/ket-qua/su-co.csv   # cửa sổ 1: dò mỗi giây, Ctrl+C để in thời gian gián đoạn
scripts/chaos.sh api                           # cửa sổ 2: api, redis, db, node, node-back
```

## Chạy toàn bộ phép đo trên GitHub Actions

Máy không đủ RAM thì đẩy nhánh lên `do-lab`: workflow `.github/workflows/do-lab.yml` dựng nguyên lab trên máy GitHub
(4 luồng, 16 GB) rồi chạy 3 job song song, kết quả tải về ở mục Artifacts của lượt chạy. Không đụng production.

| Job | Script | Gồm |
| --- | --- | --- |
| `kt2` | `ci/kt2.sh` | Thăm dò, tự chọn 3 mức, KT2 sau cải tiến, KT2 trước cải tiến (image từ commit `2693172`), tăng dần |
| `kt3` | `ci/kt3.sh` | KT1, quyền Q1–Q9, KT3-A, diễn tập sự cố, sao lưu và chép ra ngoài, thử lỗi sao lưu, KT3-B, so sánh sao lưu, PITR, failover |
| `phu` | `ci/phu.sh` | Đăng nhập đồng loạt, nộp bài, HPA, bản sao, video, mô hình tải mở và đóng, HLS với MP4, kiểm tra web |

```bash
git push origin HEAD:do-lab        # commit có chữ [nhanh] thì chạy rút gọn để thử script, không dùng làm số đo
```

## Chạy thử các giải pháp cho quy mô lớn hơn

```bash
scripts/k6.sh ghi-lien-tuc.js -e RATE=30 > k6/ket-qua/ghi.log 2>&1 &   # ghi đều, in mã mỗi lượt server đã xác nhận
scripts/failover.sh crash      # giết leader bằng SIGKILL như mất điện, đưa bản sao lên. Không có `crash` là tắt êm, không nói lên gì về RPO
scripts/doi-chieu-ghi.sh k6/ket-qua/ghi.log   # đếm lượt đã xác nhận mà bị mất trên leader mới
scripts/pitr.sh                # khôi phục theo thời điểm từ bản sao vật lý + WAL
scripts/do-phan-manh.sh        # sinh 1 triệu dòng ReviewLog giả, đo truy vấn trước và sau khi chia theo tháng
scripts/k6.sh dang-nhap.js -e PASS=... -e RATE=5   # đăng nhập đồng loạt
```

`failover.sh` và `do-phan-manh.sh` đổi hẳn trạng thái lab (leader mới, bảng đã chia). Muốn đo lại từ đầu thì `make down` rồi dựng lại.

`kb3-thi-thu.js` cứ 10 lượt gửi lại 1 lần với cùng `Idempotency-Key`. Sau khi chạy, số dòng `MockExamAttempt` phải bằng số người, không bằng số request.

## Sao lưu, khôi phục

```bash
scripts/kubectl -n hanni create job --from=cronjob/hanni-backup sao-luu-tay
scripts/restore.sh    # khôi phục bản mới nhất vào CSDL sạch, so số dòng với CSDL đang chạy
```

## Biến môi trường dành cho nhiều bản

Mặc định giữ nguyên hành vi 1 tiến trình như trên VPS, đặt ở `k8s/app/config.yaml`:

| Biến | Giá trị lab | Tác dụng |
| --- | --- | --- |
| `APP_ROLE` | `api`, `worker` | Bản `api` không chạy việc định kỳ |
| `THROTTLE_SCOPE` | `user` | Đếm giới hạn theo tài khoản trong Redis thay vì theo IP trong RAM |
| `TRUST_PROXY` | `10.42.0.0/16` | Tin ingress để lấy đúng IP khách |
| `METRICS_ENABLED` | `true` | Bật `/api/metrics` và log JSON. Ingress chặn đường này từ ngoài |
| `SHED_POOL_WAITING`, `SHED_LOOP_LAG_MS` | `8`, `250` | Từ chối lượt đọc khi hàng đợi CSDL dài, hoặc event loop trễ. 0 là tắt |
| `DB_POOL_MAX` | `10` | Số kết nối tối đa mỗi bản |
| `DATABASE_REPLICA_URL` | qua PgBouncer đọc | Truy vấn gọi `onReplica()` đọc từ bản sao, còn lại về leader |
| `CRON_LEASE` | `true` | Nhiều worker, mỗi chu kỳ cron chỉ 1 bản làm |
| `OUTBOX_ENABLED` | `true` | Việc phụ sau khi nộp bài đi qua outbox, do worker làm |
| `RESOURCES_MANIFEST`, `RESOURCE_BASE_URL`, `RESOURCE_LINK_SECRET` | | Danh sách học liệu và ký liên kết có hạn |

## Giới hạn

- Node chạy chung 1 máy, nên mất node ở đây không chứng minh được chịu lỗi phần cứng thật.
- k6 chạy cùng máy thì tranh CPU với hệ thống. Số đo chính thức phải phát tải từ máy khác, hoặc ghi rõ giới hạn.
- Prometheus, Loki, Jaeger lưu tạm, mất khi xoá pod. Dữ liệu đo phải xuất ra trước khi `make down`.
- Đổi manifest xong chạy lại `make deploy`. Đổi code thì chạy lại `make images` rồi `kubectl rollout restart`.
