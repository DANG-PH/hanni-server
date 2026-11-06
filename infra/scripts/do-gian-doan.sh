#!/usr/bin/env bash
# Gọi API mỗi giây, ghi mã trả về vào CSV. Dừng bằng Ctrl+C thì in tổng thời gian gián đoạn dài nhất.
#   ./do-gian-doan.sh ket-qua/dung-api.csv
set -uo pipefail

out=${1:?Cần đường dẫn tệp CSV}
url=${URL:-http://api.hanni.localhost:18080/api/health/ready}
mkdir -p "$(dirname "$out")"
echo 'thoi_diem,ma' > "$out"

summary() {
  awk -F, 'NR > 1 {
    if ($2 != 200) { run++; if (run > max) max = run; bad++ } else run = 0
  } END {
    printf "%d lượt, %d lượt lỗi, gián đoạn dài nhất %d giây\n", NR - 1, bad, max
  }' "$out"
  exit 0
}
trap summary INT TERM

while true; do
  code=$(curl -s -o /dev/null -m 1 -w '%{http_code}' "$url")
  echo "$(date -u +%FT%T.%3NZ),$code" >> "$out"
  sleep 1
done
