#!/usr/bin/env bash
# KT1: tải đủ học liệu như một máy khách rồi đối chiếu mã băm với manifest.sha256. Video HLS tải cả danh sách lẫn từng đoạn.
#   scripts/kt1.sh ket-qua/kt1.txt
set -euo pipefail
cd "$(dirname "$0")/.."

out=${1:?Cần tệp kết quả}
api=${API_URL:-http://api.hanni.localhost:18080/api}
token=$(python3 -c "import json; print(json.load(open('k6/tokens.json'))[0])")
manifest=media/out/manifest.sha256
mkdir -p "$(dirname "$out")"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
ok=0
bad=0
bytes=0
started=$(date +%s.%N)

{
  echo "KT1 lúc $(date '+%F %T %z'), máy khách: curl $(curl --version | head -1 | cut -d' ' -f2)"
  for id in video-mau bang-phien-am nghe-mau; do
    url=$(curl -s -X POST -H "Cookie: hanni_access=$token" "$api/resources/$id/link" | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")
    base=${url%/*}
    while read -r want path; do
      name=${path#./"$id"/}
      code=$(curl -s -o "$tmp" -w '%{http_code}' "$base/$name")
      got=$(sha256sum "$tmp" | cut -d' ' -f1)
      size=$(stat -c %s "$tmp")
      bytes=$((bytes + size))
      if [ "$code" = 200 ] && [ "$got" = "$want" ]; then
        ok=$((ok + 1))
        echo "OK    $code $size byte $id/$name"
      else
        bad=$((bad + 1))
        echo "SAI   $code $size byte $id/$name"
      fi
    done < <(grep " \./$id/" "$manifest")
  done
  printf 'Tổng: %d tệp đúng, %d tệp sai, %d byte, %.1f giây\n' "$ok" "$bad" "$bytes" "$(echo "$(date +%s.%N) - $started" | bc)"
} | tee "$out"
[ "$bad" = 0 ]
