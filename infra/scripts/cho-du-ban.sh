#!/usr/bin/env bash
# Chờ API có đúng N bản sẵn sàng và không còn bản nào đang tắt, rồi chờ thêm 20 giây cho ingress cập nhật.
# Đo khi đang đổi số bản thì request rơi vào bản đang tắt, lỗi đó là của phép đo chứ không phải của hệ thống.
#   scripts/cho-du-ban.sh 6
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"
want=${1:?Cần số bản}
for _ in $(seq 1 120); do
  ready=$(kubectl -n hanni get deployment hanni-api -o jsonpath='{.status.readyReplicas}')
  total=$(kubectl -n hanni get pods -l app=hanni-api --no-headers 2>/dev/null | wc -l)
  [ "${ready:-0}" = "$want" ] && [ "$total" = "$want" ] && { sleep 20; exit 0; }
  sleep 3
done
echo "Sau 6 phút API vẫn chưa ổn định ở $want bản" >&2
exit 1
