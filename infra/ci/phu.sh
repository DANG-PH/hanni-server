#!/usr/bin/env bash
# Job đo phụ: đăng nhập đồng loạt, đợt nộp bài, tự mở rộng, bản sao khi có tải, video, mô hình tải mở và đóng.
set -uo pipefail
. "$(dirname "$0")/chung.sh"
echo 'ca,ma_thoat,giay' > "$R/cac-ca.csv"
runs=3; dur=1m; login_rates="10 20 40"; viewers="60 150 300"; hpa="-e MAX_RATE=100 -e STEP=60s -e HOLD=120s"; model_rates="15 30"; model_dur=3m
if [ "$NHANH" = 1 ]; then
  runs=1; dur=15s; login_rates="10"; viewers="60"; hpa="-e MAX_RATE=30 -e STEP=10s -e HOLD=10s"; model_rates="10"; model_dur=20s
fi
mkdir -p "$R/dang-nhap" "$R/nop-bai" "$R/hpa" "$R/ban-sao" "$R/video" "$R/mo-hinh-tai" "$R/so-sanh-video"
clean() { sed -i '/^running (/d; /  *\[ *[0-9]*%/d' "$1"; }
sql() { kubectl -n hanni exec -c postgres "$1" -- psql -U hanni -d hanni -Atc "$2"; }

dang_nhap() {
  local pass
  pass=$(kubectl -n hanni get secret hanni-secrets -o jsonpath='{.data.LOADTEST_PASSWORD}' | base64 -d)
  for rate in $login_rates; do
    for i in $(seq 1 "$runs"); do
      SUMMARY="dn-$rate-$i" scripts/k6.sh dang-nhap.js -e PASS="$pass" -e RATE="$rate" -e DURATION="$dur" > "$R/dang-nhap/muc-$rate-lan-$i.txt" 2>&1
      clean "$R/dang-nhap/muc-$rate-lan-$i.txt"
      mv "$R/dn-$rate-$i.json" "$R/dang-nhap/muc-$rate-lan-$i.json" 2>/dev/null
    done
  done
}
ca "dang-nhap" dang_nhap

nop_bai() {
  for i in $(seq 1 "$runs"); do
    local before pending
    before=$(sql hanni-postgres-0 'SELECT count(*) FROM "MockExamAttempt"')
    local s
    s=$(date +%s)
    SUMMARY="kb3-$i" scripts/k6.sh kb3-thi-thu.js -e USERS=600 > "$R/nop-bai/lan-$i.txt" 2>&1
    clean "$R/nop-bai/lan-$i.txt"
    mv "$R/kb3-$i.json" "$R/nop-bai/lan-$i.json" 2>/dev/null
    sleep 5
    pending=$(sql hanni-postgres-0 'SELECT count(*) FROM "OutboxEvent" WHERE "processedAt" IS NULL')
    echo "lần $i: dòng MockExamAttempt tăng $(( $(sql hanni-postgres-0 'SELECT count(*) FROM "MockExamAttempt"') - before )), outbox còn chờ $pending" | tee -a "$R/nop-bai/doi-chieu.txt"
    chi_so "$s" "$(date +%s)" "$R/nop-bai/lan-$i-prometheus.csv"
  done
}
ca "nop-bai" nop_bai

hpa_va_ban_sao() {
  co_dinh_api 2 6
  sleep 30
  local leader_before replica_before s
  replica_before=$(sql hanni-postgres-replica-0 "SELECT xact_commit FROM pg_stat_database WHERE datname='hanni'")
  s=$(date +%s)
  ( while :; do
      echo "$(date +%s),$(sql hanni-postgres-0 'SELECT COALESCE(max(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)),0) FROM pg_stat_replication'),$(kubectl -n hanni get hpa hanni-api -o jsonpath='{.status.currentReplicas}')"
      curl -s -o /dev/null -H "Cookie: hanni_access=$(python3 -c "import json; print(json.load(open('k6/tokens.json'))[5])")" http://api.hanni.localhost:18080/api/leaderboard
      sleep 5
    done > "$R/ban-sao/tre-sao-chep.csv" ) &
  local sampler=$!
  SUMMARY="hpa" scripts/k6.sh tang-dan.js $hpa -e MAX_VUS=300 --no-thresholds > "$R/hpa/tang-dan.txt" 2>&1
  kill "$sampler" 2>/dev/null
  clean "$R/hpa/tang-dan.txt"
  mv "$R/hpa.json" "$R/hpa/tang-dan.json" 2>/dev/null
  sed -i '1i thoi_diem_epoch,tre_sao_chep_byte,so_ban_api' "$R/ban-sao/tre-sao-chep.csv"
  echo "Giao dịch trên bản sao tăng $(( $(sql hanni-postgres-replica-0 "SELECT xact_commit FROM pg_stat_database WHERE datname='hanni'") - replica_before )) trong lúc đo" | tee "$R/ban-sao/doc-ban-sao.txt"
  chi_so "$s" "$(date +%s)" "$R/hpa/prometheus.csv"
  kubectl -n hanni get events --sort-by=.lastTimestamp | grep -iE "SuccessfulRescale|Scaled" > "$R/hpa/su-kien-hpa.txt"
}
ca "hpa-ban-sao" hpa_va_ban_sao

video() {
  for v in $viewers; do
    SUMMARY="kb2-$v" scripts/k6.sh kb2-video.js -e VIEWERS="$v" -e DURATION=2m > "$R/video/nguoi-xem-$v.txt" 2>&1
    clean "$R/video/nguoi-xem-$v.txt"
    mv "$R/kb2-$v.json" "$R/video/nguoi-xem-$v.json" 2>/dev/null
  done
}
ca "video" video

mo_hinh() {
  co_dinh_api 6 6
  for rate in $model_rates; do
    for i in $(seq 1 "$runs"); do
      SUMMARY="mo-$rate-$i" scripts/k6.sh kb1-tu-hoc.js -e RATE="$rate" -e DURATION="$model_dur" -e MAX_VUS=400 > "$R/mo-hinh-tai/mo-$rate-lan-$i.txt" 2>&1
      clean "$R/mo-hinh-tai/mo-$rate-lan-$i.txt"
      mv "$R/mo-$rate-$i.json" "$R/mo-hinh-tai/mo-$rate-lan-$i.json" 2>/dev/null
      # Số VU đóng = tốc độ mở × thời gian 1 lượt đo được ở lượt mở, để lúc server khoẻ 2 mô hình có cùng thông lượng.
      local vus
      vus=$(python3 -c "import json,math; m=json.load(open('$R/mo-hinh-tai/mo-$rate-lan-$i.json'))['metrics']; print(max(1, math.ceil($rate * m['iteration_duration']['avg'] / 1000)))")
      SUMMARY="dong-$rate-$i" scripts/k6.sh kb1-dong.js -e VUS="$vus" -e DURATION="$model_dur" > "$R/mo-hinh-tai/dong-$rate-lan-$i.txt" 2>&1
      clean "$R/mo-hinh-tai/dong-$rate-lan-$i.txt"
      mv "$R/dong-$rate-$i.json" "$R/mo-hinh-tai/dong-$rate-lan-$i.json" 2>/dev/null
      echo "mức $rate lần $i: mô hình đóng dùng $vus VU" >> "$R/mo-hinh-tai/vu.txt"
    done
  done
  co_dinh_api 2 6
}
ca "mo-hinh-tai" mo_hinh

so_sanh_video() {
  local dir=/tmp/so-sanh-video watch=60000 n=$runs
  [ "$NHANH" = 1 ] && watch=15000
  mkdir -p "$dir"
  cp scripts/so-sanh-video.cjs "$dir/"
  (cd "$dir" && npm i --no-save --no-audit --no-fund --silent playwright-core@1.63.0 hls.js@1.6.15)
  WATCH_MS=$watch node "$dir/so-sanh-video.cjs" "$R/so-sanh-video/ket-qua.csv" "$n" "$(python3 -c "import json; print(json.load(open('k6/tokens.json'))[9])")"
}
ca "so-sanh-video" so_sanh_video

web() {
  local dir=/tmp/hanni-client api=http://api.hanni.localhost:18080/api runs_lh=3
  [ "$NHANH" = 1 ] && runs_lh=1
  mkdir -p "$R/web"
  git clone -q --depth 1 -b feat/hoc-lieu https://github.com/DANG-PH/hanni-client.git "$dir"
  git -C "$dir" rev-parse --short HEAD > "$R/web/commit-client.txt"
  (cd "$dir" && npm ci --no-audit --no-fund --silent && NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL=$api npx next build > "$OLDPWD/$R/web/build.txt" 2>&1)
  (cd "$dir" && NEXT_PUBLIC_API_URL=$api nohup npx next start -H 0.0.0.0 -p 3000 > /tmp/next.log 2>&1 &)
  for _ in $(seq 1 60); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://hanni.localhost:3000/hoc-lieu)" = 200 ] && break; sleep 2; done
  (cd "$dir" && CHROME_PATH=/usr/bin/google-chrome BASE_URL=http://hanni.localhost:3000 npm run -s test:hoc-lieu) > "$R/web/test-hoc-lieu.txt" 2>&1
  for preset in mobile desktop; do
    local flag=""
    [ "$preset" = desktop ] && flag="--preset=desktop"
    for i in $(seq 1 "$runs_lh"); do
      CHROME_PATH=/usr/bin/google-chrome npx -y lighthouse@12.8.2 http://hanni.localhost:3000/hoc-lieu $flag --quiet \
        --output=json --output-path="$R/web/lighthouse-$preset-$i.json" --chrome-flags="--headless=new --no-sandbox" \
        --only-categories=performance,accessibility,best-practices,seo
    done
  done
}
ca "web" web
