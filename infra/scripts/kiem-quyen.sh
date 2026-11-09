#!/usr/bin/env bash
# Kiểm thử quyền Q1–Q9 bằng tài khoản giả, không dùng quyền quản trị. In bảng mong đợi và thực tế, mã thoát khác 0 nếu có ca sai.
#   scripts/kiem-quyen.sh k6/ket-qua/quyen.txt
set -uo pipefail
cd "$(dirname "$0")/.."
PATH="$PWD/scripts:$PATH"

out=${1:?Cần tệp kết quả}
api=http://api.hanni.localhost:18080/api
a=$(python3 -c "import json; print(json.load(open('k6/tokens.json'))[0])")
b=$(python3 -c "import json; print(json.load(open('k6/tokens.json'))[1])")
secret=$(kubectl -n hanni get secret hanni-secrets -o jsonpath='{.data.RESOURCE_LINK_SECRET}' | base64 -d)
fail=0
mkdir -p "$(dirname "$out")"
: > "$out"

check() {
  local code=$1 want=$2 label=$3
  local verdict=ĐẠT
  [[ "$code" =~ ^($want)$ ]] || { verdict=SAI; fail=1; }
  printf '%-4s %-62s mong đợi %-10s thực tế %-10s %s\n' "${label%% *}" "${label#* }" "$want" "$code" "$verdict" | tee -a "$out"
}

sign() {  # $1 = hạn epoch, $2 = thư mục: base64url(md5(hạn + "/" + thư mục + " " + bí mật))
  printf '%s/%s %s' "$1" "$2" "$secret" | openssl md5 -binary | openssl base64 | tr '+/' '-_' | tr -d '='
}

echo "Kiểm thử quyền lúc $(date '+%F %T %z')" | tee -a "$out"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$api/resources/video-mau/link")" 401 "Q1 Khách xin liên kết R1 cần đăng nhập"

old=$(( $(date +%s) - 60 ))
check "$(curl -s -o /dev/null -w '%{http_code}' "http://media.hanni.localhost:18080/files/$(sign $old video-mau)/$old/video-mau/master.m3u8")" 410 "Q2 Dùng liên kết đã hết hạn"

url=$(curl -s -X POST -H "Cookie: hanni_access=$a" "$api/resources/video-mau/link" | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")
bad=$(echo "$url" | python3 -c "import sys,re; u=sys.stdin.read().strip(); print(re.sub(r'/files/([^/]+)/', lambda m: '/files/' + ('A' if m.group(1)[0] != 'A' else 'B') + m.group(1)[1:] + '/', u))")
check "$(curl -s -o /dev/null -w '%{http_code}' "$bad")" 403 "Q3 Sửa chữ ký trên liên kết"
check "$(curl -s -o /dev/null -w '%{http_code}' "$url")" 200 "Q4 Người học xin liên kết R1 đúng quyền"

room=$(curl -s -X POST -H "Cookie: hanni_access=$b" -H 'Content-Type: application/json' -d '{"name":"Lop kiem thu quyen"}' "$api/classrooms" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
check "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: hanni_access=$a" "$api/classrooms/$room")" "403|404" "Q5 Người học xem tiến độ lớp của người khác"
[ -n "$room" ] && curl -s -o /dev/null -X DELETE -H "Cookie: hanni_access=$b" "$api/classrooms/$room"

pod_ip=$(kubectl -n hanni get pod hanni-postgres-0 -o jsonpath='{.status.podIP}')
code=$(timeout 6 bash -c "echo > /dev/tcp/$pod_ip/5432" 2>/dev/null && echo mo || echo dong)
check "$code" dong "Q6 Máy ngoài cụm nối thẳng Postgres $pod_ip:5432"
code=$(timeout 6 bash -c "echo > /dev/tcp/127.0.0.1/6379" 2>/dev/null && echo mo || echo dong)
check "$code" dong "Q6 Máy ngoài cụm nối Redis qua 127.0.0.1:6379"

probe() {  # nối TCP từ trong pod API tới $1:$2, in ket-noi hoặc chan
  kubectl -n hanni exec deploy/hanni-api -- node -e "
    const s = require('net').connect($2, '$1');
    s.on('connect', () => { console.log('ket-noi'); process.exit(0); });
    s.on('error', () => { console.log('chan'); process.exit(0); });
    setTimeout(() => { console.log('chan'); process.exit(0); }, 4000);" 2>/dev/null | tail -1
}
check "$(probe hanni-pgbouncer 5432)" ket-noi "Q7 Pod API nối PgBouncer, đường được phép"
check "$(probe hanni-postgres 5432)" chan "Q7 Pod API nối thẳng Postgres, bỏ qua PgBouncer"

check "$(curl -s -o /dev/null -w '%{http_code}' "$api/metrics")" 404 "Q8 Từ ngoài cụm gọi /api/metrics"
check "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: hanni_access=$a" "$api/partners/leads")" 403 "Q9 Người học gọi route chỉ dành cho quản trị"

[ "$fail" = 0 ] && echo "Tất cả ca đạt" | tee -a "$out" || echo "Có ca sai" | tee -a "$out"
exit "$fail"
