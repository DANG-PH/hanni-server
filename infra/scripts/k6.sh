#!/usr/bin/env bash
# Chạy 1 kịch bản k6 trong Docker, không cần cài k6. Kết quả tóm tắt ghi vào infra/k6/ket-qua/.
#   ./k6.sh kb1-tu-hoc.js -e RATE=4 -e DURATION=5m
# Đặt SUMMARY=<tên> để đổi tên tệp tóm tắt, chạy theo lô thì dễ tìm hơn.
set -euo pipefail

cd "$(dirname "$0")/../k6"
script=${1:?Cần tên kịch bản, ví dụ kb1-tu-hoc.js}
shift
stamp=$(date -u +%Y%m%d-%H%M%S)
mkdir -p ket-qua

docker run --rm -i --network host \
  --add-host api.hanni.localhost:127.0.0.1 \
  --add-host media.hanni.localhost:127.0.0.1 \
  -v "$PWD:/k6" -u "$(id -u)" \
  grafana/k6:0.57.0 run "$@" \
  --summary-trend-stats 'avg,min,med,max,p(90),p(95),p(99)' \
  --summary-export "/k6/ket-qua/${SUMMARY:-${script%.js}-$stamp}.json" \
  "/k6/$script"
