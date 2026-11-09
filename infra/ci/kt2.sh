#!/usr/bin/env bash
# Job KT2: đo thăm dò, tự chọn 3 mức, KT2 sau cải tiến, rồi cùng 3 mức với image TRƯỚC cải tiến (commit 2693172:
# chưa có cache khung lộ trình, chưa có từ chối khi quá tải). Cấu hình Kubernetes giữ nguyên, chỉ đổi image API.
set -uo pipefail
. "$(dirname "$0")/chung.sh"
echo 'ca,ma_thoat,giay' > "$R/cac-ca.csv"

if [ "$NHANH" = 1 ]; then
  export WARM=10s HOLD=20s
  probe="10 30"; runs=1; ramp="-e MAX_RATE=40 -e STEP=10s -e HOLD=10s"
else
  export WARM=1m HOLD=5m
  probe="10 20 30 40 50 60 70 80"; runs=3; ramp="-e MAX_RATE=200 -e STEP=30s -e HOLD=60s"
fi

do_tang_dan() {  # $1 = tên thư mục
  co_dinh_api 6 6
  local s
  s=$(date +%s)
  SUMMARY="tang-dan-$1" scripts/k6.sh tang-dan.js $ramp -e MAX_VUS=300 --no-thresholds > "$R/$1/tang-dan.txt" 2>&1
  sed -i '/^running (/d; /tang_dan  *\[/d' "$R/$1/tang-dan.txt"
  mv "$R/tang-dan-$1.json" "$R/$1/tang-dan.json" 2>/dev/null
  chi_so "$s" "$(date +%s)" "$R/$1/tang-dan-prometheus.csv"
  co_dinh_api 2 6
}

s=$(date +%s)
keep_warm=$WARM keep_hold=$HOLD
[ "$NHANH" = 1 ] || { WARM=30s; HOLD=1m; }
ca "tham-do" scripts/chay-kt2.sh "$R/tham-do" "$probe" 1
WARM=$keep_warm HOLD=$keep_hold
chi_so "$s" "$(date +%s)" "$R/tham-do/prometheus.csv"
levels=$(scripts/chon-muc.py "$R/tham-do")
echo "3 mức KT2: $levels" | tee "$R/muc-kt2.txt"

s=$(date +%s)
ca "kt2-sau" scripts/chay-kt2.sh "$R/kt2-sau" "$levels" "$runs"
chi_so "$s" "$(date +%s)" "$R/kt2-sau/prometheus.csv"
ca "tang-dan-sau" do_tang_dan kt2-sau

buoc "Build image trước cải tiến"
git worktree add -f /tmp/truoc 2693172 >/dev/null 2>&1
docker build -q --target api -t hanni-api:truoc /tmp/truoc
docker save hanni-api:truoc | docker compose exec -T server ctr images import - >/dev/null
docker save hanni-api:truoc | docker compose exec -T agent ctr images import - >/dev/null
kubectl -n hanni set image deployment/hanni-api api=hanni-api:truoc >/dev/null
kubectl -n hanni rollout status deployment/hanni-api --timeout=300s
xong

s=$(date +%s)
ca "kt2-truoc" scripts/chay-kt2.sh "$R/kt2-truoc" "$levels" "$runs"
chi_so "$s" "$(date +%s)" "$R/kt2-truoc/prometheus.csv"
ca "tang-dan-truoc" do_tang_dan kt2-truoc
