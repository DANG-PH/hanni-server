#!/usr/bin/env bash
# Quay video demo từ thao tác thật trên lab rồi ghép với thẻ tiêu đề ở demo/the/*.html theo thứ tự tên tệp.
# Cảnh lệnh dòng lệnh là phát lại đúng nội dung vừa chạy, có ghi giờ chạy; không dựng số.
set -uo pipefail
. "$(dirname "$0")/chung.sh"
V=$R/video
mkdir -p "$V/canh" "$V/png" "$V/mp4"
PASS=$(kubectl -n hanni get secret hanni-secrets -o jsonpath='{.data.LOADTEST_PASSWORD}' | base64 -d)
GRAFANA_PASS=$(kubectl -n observability get secret grafana-admin -o jsonpath='{.data.password}' | base64 -d)
export PASS GRAFANA_PASS
Q=/tmp/quay
mkdir -p "$Q" && cp scripts/quay-demo.cjs "$Q/" && (cd "$Q" && npm i --no-save --no-audit --no-fund --silent playwright-core@1.63.0)
# Ghi hình của Playwright cần bản ffmpeg riêng của nó, máy GitHub chưa có sẵn.
(cd "$Q" && npx playwright-core install ffmpeg)
q() { node "$Q/quay-demo.cjs" "$@"; }
gio() { date -u '+%H:%M:%S UTC %d/%m/%Y'; }
active() {
  kubectl -n observability exec deploy/prometheus -- wget -qO- http://alertmanager:9093/api/v2/alerts 2>/dev/null |
    python3 -c "import json,sys; print(' '.join(a['labels']['alertname'] for a in json.load(sys.stdin) if a['status']['state']=='active'))" 2>/dev/null
}

buoc "Web"
dung_web || echo "web chưa chạy"
xong

for f in demo/the/*.html; do q the "$f" "$V/png/$(basename "${f%.html}").png"; done

buoc "Cảnh 20 web"
q web "$V/canh/20-web"
xong

buoc "Cảnh 30 KT1, 31 quyền"
scripts/kt1.sh "$V/kt1.txt" >/dev/null
q terminal "$V/kt1.txt" "Kiểm thử 1: tải đủ học liệu như máy khách, so mã băm SHA-256 · chạy lúc $(gio)" "$V/canh/30-kt1"
scripts/kiem-quyen.sh "$V/quyen.txt" >/dev/null
q terminal "$V/quyen.txt" "Kiểm thử phân quyền bằng tài khoản giả · chạy lúc $(gio)" "$V/canh/31-quyen"
xong

buoc "Cảnh 40 tăng tải và HPA"
kubectl -n hanni patch hpa hanni-api --type merge -p '{"spec":{"minReplicas":2,"maxReplicas":6}}' >/dev/null
# 40 lượt/giây ≈ 200 request/giây: đủ để HPA lên 6 bản mà chưa phải từ chối request.
SUMMARY=demo-tang-dan scripts/k6.sh tang-dan.js -e MAX_RATE=40 -e STEP=25s -e HOLD=60s -e MAX_VUS=200 --no-thresholds > "$V/tang-dan.txt" 2>&1 &
k6pid=$!
sleep 40
q grafana hanni-scaling 85 "$V/canh/40-hpa" "Tăng dần tải bằng k6: CPU vượt 65% thì Kubernetes tự thêm bản API, tối đa 6 bản"
wait "$k6pid"
grep -E "http_req_duration|http_req_failed|http_reqs|iterations\.|vus_max" "$V/tang-dan.txt" | sed 's/^ *//' > "$V/k6-tom-tat.txt"
kubectl -n hanni get hpa hanni-api >> "$V/k6-tom-tat.txt" 2>&1
q terminal "$V/k6-tom-tat.txt" "Kết quả k6 của đợt tăng tải vừa quay · chạy lúc $(gio)" "$V/canh/41-k6"
xong

buoc "Cảnh 50 mất 1 bản API"
scripts/do-gian-doan.sh "$V/chaos.csv" > "$V/chaos.txt" 2>&1 &
probe=$!
( sleep 20; scripts/chaos.sh api > /dev/null 2>&1 ) &
q grafana hanni-slo 55 "$V/canh/50-chaos" "Tắt đột ngột 1 bản API: bản còn lại gánh, Kubernetes tự tạo lại, người dùng không thấy lỗi"
kill -TERM "$probe" 2>/dev/null; wait "$probe" 2>/dev/null
{ echo "scripts/chaos.sh api lúc $(gio)"; tail -1 "$V/chaos.txt"; } > "$V/chaos-tom-tat.txt"
q terminal "$V/chaos-tom-tat.txt" "Dò /api/health/ready mỗi giây trong lúc mất 1 bản API" "$V/canh/51-chaos"
xong

buoc "Cảnh 60 dừng hẳn API, cảnh báo, khôi phục"
start=$(date +%s)
kubectl -n hanni scale deployment hanni-api --replicas=0 >/dev/null
until active | grep -q HanniEdgeDown; do sleep 5; [ $(( $(date +%s) - start )) -gt 300 ] && break; done
fired=$(( $(date +%s) - start ))
q alert 15 "$V/canh/60-alert"
t1=$(date +%s)
kubectl -n hanni scale deployment hanni-api --replicas=2 >/dev/null
until [ "$(curl -s -m 1 -o /dev/null -w '%{http_code}' http://api.hanni.localhost:18080/api/health/ready)" = 200 ]; do sleep 0.5; done
back=$(( $(date +%s) - t1 ))
scripts/kt1.sh "$V/kt1-sau.txt" >/dev/null
{ echo "Dừng hẳn API lúc $(date -u -d @"$start" '+%H:%M:%S UTC')"; echo "HanniEdgeDown báo sau $fired giây (không quay đoạn chờ)"; echo "Bật lại 2 bản: có trả lời sau $back giây"; tail -1 "$V/kt1-sau.txt"; } > "$V/kt3a.txt"
q terminal "$V/kt3a.txt" "Kiểm thử 3: dừng dịch vụ rồi khôi phục, kiểm tra lại học liệu" "$V/canh/61-kt3a"
xong

buoc "Cảnh 70 mất dữ liệu và khôi phục"
scripts/kt3-mat-du-lieu.sh > "$V/kt3b-day-du.txt" 2>&1
grep -vE "^hanni-|NOTICE" "$V/kt3b-day-du.txt" > "$V/kt3b.txt"
q terminal "$V/kt3b.txt" "Kiểm thử 3: xoá hẳn CSDL và 1 tệp học liệu, khôi phục từ bản sao lưu · chạy lúc $(gio)" "$V/canh/70-kt3b"
xong

buoc "Ghép video"
ff() { docker run --rm -u "$(id -u)" -v "$PWD/$V:/v" --entrypoint /usr/local/bin/ffmpeg linuxserver/ffmpeg:7.1.1 -hide_banner -loglevel error -y "$@"; }
for p in "$V"/png/*.png; do
  n=$(basename "${p%.png}")
  secs=7
  [[ "$n" == *-dai ]] && secs=11
  ff -loop 1 -framerate 30 -t "$secs" -i "/v/png/$n.png" -f lavfi -t "$secs" -i anullsrc=r=44100:cl=mono -vf "scale=1280:720,format=yuv420p" \
    -c:v libx264 -preset veryfast -c:a aac -shortest "/v/mp4/$n.mp4"
done
for d in "$V"/canh/*; do
  n=$(basename "$d")
  w=$(ls "$d"/*.webm 2>/dev/null | head -1)
  [ -n "$w" ] || continue
  ss=$(cat "$d/cat-dau.txt" 2>/dev/null || echo 0)   # bỏ đoạn chờ tải trang trước phụ đề đầu tiên
  ff -ss "$ss" -i "/v/canh/$n/$(basename "$w")" -f lavfi -i anullsrc=r=44100:cl=mono -vf "scale=1280:720,fps=30,format=yuv420p" \
    -c:v libx264 -preset veryfast -c:a aac -shortest "/v/mp4/$n.mp4"
done
ls "$V"/mp4/*.mp4 | sort | sed 's#.*/#file /v/mp4/#' > "$V/ds.txt"
ff -f concat -safe 0 -i /v/ds.txt -c copy /v/video-demo.mp4
docker run --rm -v "$PWD/$V:/v" --entrypoint /usr/local/bin/ffprobe linuxserver/ffmpeg:7.1.1 -v error -show_entries format=duration -of csv=p=0 /v/video-demo.mp4 | tee "$V/thoi-luong-giay.txt"
xong
