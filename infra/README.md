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

Mật khẩu Grafana:

```bash
scripts/kubectl -n observability get secret grafana-admin -o jsonpath='{.data.password}' | base64 -d
```

## Đo tải

k6 chạy trong Docker, chỉ nhận địa chỉ lab. Kết quả tóm tắt ghi vào `k6/ket-qua/`.

```bash
scripts/k6.sh kb1-tu-hoc.js -e RATE=4 -e DURATION=5m     # tự học, RATE là lượt mở bài mỗi giây
scripts/k6.sh kb2-video.js -e VIEWERS=60                 # cả lớp xem video
scripts/k6.sh kb3-thi-thu.js -e USERS=600                # mở đề 60 giây, nộp bài 30 giây
scripts/k6.sh tang-dan.js -e MAX_RATE=30                 # tăng dần để tìm điểm gãy và xem HPA thêm bản
k6/thu-tai-nguyen.sh k6/ket-qua/lan1.csv                 # chạy song song, ghi CPU, RAM, số bản mỗi 5 giây
```

## Diễn tập sự cố

```bash
scripts/do-gian-doan.sh k6/ket-qua/su-co.csv   # cửa sổ 1: dò mỗi giây, Ctrl+C để in thời gian gián đoạn
scripts/chaos.sh api                           # cửa sổ 2: api, redis, db, node, node-back
```

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
| `DB_POOL_MAX` | `10` | Số kết nối tối đa mỗi bản |
| `RESOURCES_MANIFEST`, `RESOURCE_BASE_URL`, `RESOURCE_LINK_SECRET` | | Danh sách học liệu và ký liên kết có hạn |

## Giới hạn

- Node chạy chung 1 máy, nên mất node ở đây không chứng minh được chịu lỗi phần cứng thật.
- k6 chạy cùng máy thì tranh CPU với hệ thống. Số đo chính thức phải phát tải từ máy khác, hoặc ghi rõ giới hạn.
- Prometheus, Loki, Jaeger lưu tạm, mất khi xoá pod. Dữ liệu đo phải xuất ra trước khi `make down`.
- Đổi manifest xong chạy lại `make deploy`. Đổi code thì chạy lại `make images` rồi `kubectl rollout restart`.
