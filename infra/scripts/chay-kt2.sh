#!/usr/bin/env bash
# KT2: 3 mức tải, mỗi mức nhiều lần, mỗi lần làm nóng rồi đo. Ghi k6, CPU/RAM từng pod, swap và điều kiện đo.
# Cố định số bản API để các lần đo so được với nhau; tự mở rộng đo riêng bằng tang-dan.js.
#   scripts/chay-kt2.sh k6/ket-qua/kt2 "12 28 40" 3
# Lần nào cột swap_trang trong swap.csv lớn thì máy đã swap: lần đó không dùng được, chạy lại.
set -uo pipefail
cd "$(dirname "$0")/.."
PATH="$PWD/scripts:$PATH"

out=${1:?Cần thư mục kết quả}
rates=${2:-12 28 40}
runs=${3:-3}
warm=${WARM:-1m}
hold=${HOLD:-5m}
pods=${PODS:-6}
mkdir -p "$out"
name=$(basename "$out")

kubectl -n hanni patch hpa hanni-api --type merge -p "{\"spec\":{\"minReplicas\":$pods,\"maxReplicas\":$pods}}" >/dev/null
scripts/cho-du-ban.sh "$pods"

{
  echo "Thời điểm: $(date '+%F %T %z')"
  echo "Commit: $(git rev-parse --short HEAD)"
  echo "Image API: $(kubectl -n hanni get deploy hanni-api -o jsonpath='{.spec.template.spec.containers[0].image}')"
  echo "Số bản API: $pods, mỗi bản tối đa 1 CPU, 512 MB"
  echo "Máy: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs), $(nproc) luồng, $(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo) MB RAM, $(. /etc/os-release; echo "$PRETTY_NAME")"
  echo "k6 chạy chung máy với hệ thống, đi qua loopback tới ingress Traefik"
  echo "Làm nóng $warm, đo $hold, $runs lần mỗi mức, mức (lượt mở bài/giây): $rates"
  kubectl -n hanni get configmap hanni-env -o jsonpath='{.data}' | tr ',' '\n' | grep -E 'THROTTLE|SHED|DB_POOL|CRON|OUTBOX'
} > "$out/dieu-kien.txt"

swap_pages() { awk '/pswpout/ {print $2}' /proc/vmstat; }
echo 'muc,lan,bat_dau,swap_trang' > "$out/swap.csv"

for rate in $rates; do
  for run in $(seq 1 "$runs"); do
    tag="muc-$rate-lan-$run"
    SUMMARY="$name-lam-nong" scripts/k6.sh kb1-tu-hoc.js -e RATE="$rate" -e DURATION="$warm" -e MAX_VUS=400 --no-thresholds >/dev/null 2>&1
    k6/thu-tai-nguyen.sh "$out/$tag-tai-nguyen.csv" &
    sampler=$!
    before=$(swap_pages)
    started=$(date -u +%FT%TZ)
    SUMMARY="$name-$tag" scripts/k6.sh kb1-tu-hoc.js -e RATE="$rate" -e DURATION="$hold" -e MAX_VUS=400 > "$out/$tag.txt" 2>&1
    kill "$sampler" 2>/dev/null
    wait "$sampler" 2>/dev/null
    echo "$rate,$run,$started,$(( $(swap_pages) - before ))" >> "$out/swap.csv"
    sed -i '/^running (/d; /tu_hoc  *\[/d' "$out/$tag.txt"
    mv "k6/ket-qua/$name-$tag.json" "$out/$tag.json"
    echo "$(date +%T) xong $tag"
  done
done

rm -f "k6/ket-qua/$name-lam-nong.json"
kubectl -n hanni patch hpa hanni-api --type merge -p '{"spec":{"minReplicas":2,"maxReplicas":6}}' >/dev/null
