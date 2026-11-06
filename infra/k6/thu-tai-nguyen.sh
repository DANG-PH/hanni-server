#!/usr/bin/env bash
# Ghi CPU, RAM từng pod và số bản HPA mỗi 5 giây vào CSV, chạy song song với k6 rồi Ctrl+C.
#   ./thu-tai-nguyen.sh ket-qua/kb1-lan1.csv
set -euo pipefail
PATH="$(cd "$(dirname "$0")/../scripts" && pwd):$PATH"

out=${1:?Cần đường dẫn tệp CSV}
mkdir -p "$(dirname "$out")"
echo 'thoi_diem,pod,cpu_mili,ram_mib,so_ban_api' > "$out"

while true; do
  now=$(date -u +%FT%TZ)
  replicas=$(kubectl -n hanni get hpa hanni-api -o jsonpath='{.status.currentReplicas}')
  kubectl -n hanni top pods --no-headers | awk -v t="$now" -v r="$replicas" '{
    gsub(/m/, "", $2); gsub(/Mi/, "", $3); print t "," $1 "," $2 "," $3 "," r
  }' >> "$out"
  sleep 5
done
