#!/usr/bin/env bash
# Chờ đủ 2 node sẵn sàng: nạp image vào node chưa lên sẽ lỗi vì containerd chưa chạy.
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

for _ in $(seq 1 60); do
  ready=$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready')
  [ "$ready" = 2 ] && exit 0
  sleep 3
done
echo 'Sau 3 phút vẫn chưa đủ 2 node. Xem log: docker compose logs server' >&2
exit 1
