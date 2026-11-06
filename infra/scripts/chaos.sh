#!/usr/bin/env bash
# Diễn tập sự cố trên lab. Chạy do-gian-doan.sh ở cửa sổ khác để đo, xem Grafana để thấy cảnh báo.
#   ./chaos.sh api        giết 1 bản API: bản còn lại gánh, Kubernetes tự tạo lại
#   ./chaos.sh redis      giết Redis: API vẫn trả lời nhờ giới hạn request cho qua khi Redis lỗi
#   ./chaos.sh db         giết Postgres: API báo chưa sẵn sàng, Postgres lên lại thì tự phục hồi
#   ./chaos.sh node       dừng node agent: pod trên đó dời sang node còn lại
#   ./chaos.sh node-back  bật lại node agent
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"
cd "$(dirname "$0")/.."

case "${1:-}" in
  api) kubectl -n hanni delete pod "$(kubectl -n hanni get pod -l app=hanni-api -o name | head -1 | cut -d/ -f2)" --grace-period=0 --force ;;
  redis) kubectl -n hanni delete pod -l app=hanni-redis --grace-period=0 --force ;;
  db) kubectl -n hanni delete pod hanni-postgres-0 --grace-period=0 --force ;;
  node) docker compose stop agent ;;
  node-back) docker compose start agent ;;
  *) sed -n 2,7p "$0"; exit 1 ;;
esac
