#!/usr/bin/env bash
# Job KT1 + KT3 + quyền + sao lưu. Failover chạy cuối vì đổi hẳn trạng thái cụm.
set -uo pipefail
. "$(dirname "$0")/chung.sh"
echo 'ca,ma_thoat,giay' > "$R/cac-ca.csv"
runs=3
[ "$NHANH" = 1 ] && runs=1
mkdir -p "$R/kt1" "$R/chaos" "$R/sao-luu"

for i in $(seq 1 "$runs"); do ca "kt1-lan-$i" scripts/kt1.sh "$R/kt1/kt1-lan-$i.txt"; done
cp media/out/manifest.sha256 "$R/kt1/"
ca "quyen" scripts/kiem-quyen.sh "$R/quyen.txt"
ca "kt3-a" scripts/kt3-dung-dich-vu.sh "$R/kt3-a" "$runs"

chaos_ca() {  # $1 = loại sự cố, $2 = giây chờ trước khi đọc kết quả
  scripts/do-gian-doan.sh "$R/chaos/$1.csv" > "$R/chaos/$1.txt" 2>&1 &
  local probe=$!
  sleep 5
  local s
  s=$(date +%s)
  scripts/chaos.sh "$1" > /dev/null 2>&1
  if [ "$1" = node ]; then
    sleep 100
    scripts/chaos.sh node-back > /dev/null 2>&1
  fi
  sleep "$2"
  kill -TERM "$probe" 2>/dev/null
  wait "$probe" 2>/dev/null
  chi_so "$s" "$(date +%s)" "$R/chaos/$1-prometheus.csv"
  echo "$1: $(tail -1 "$R/chaos/$1.txt")" | tee -a "$R/chaos/tom-tat.txt"
}
for c in api redis db; do ca "chaos-$c" chaos_ca "$c" 90; done
ca "chaos-node" chaos_ca node 120

# Sinh dữ liệu học trước khi sao lưu, để khôi phục có cái mà đối chiếu: 1 triệu dòng ReviewLog (chia theo tháng)
# và 1 đợt 600 người nộp bài thi thử.
rows=1000000
[ "$NHANH" = 1 ] && rows=50000
ca "phan-manh" bash -c "scripts/do-phan-manh.sh $rows > $R/phan-manh.txt 2>&1"
ca "du-lieu-thi" bash -c "scripts/k6.sh kb3-thi-thu.js -e USERS=600 > $R/du-lieu-thi.txt 2>&1"
sed -i '/^running (/d' "$R/du-lieu-thi.txt"

buoc "Sao lưu theo lịch, chạy tay ngay"
kubectl -n hanni create job --from=cronjob/hanni-backup sao-luu-tay >/dev/null
kubectl -n hanni wait --for=condition=complete job/sao-luu-tay --timeout=300s
kubectl -n hanni logs job/sao-luu-tay > "$R/sao-luu/nhat-ky-sao-luu.txt" 2>&1
kubectl -n hanni get cronjob,job -l app=hanni-backup > "$R/sao-luu/cronjob.txt" 2>&1
kubectl -n hanni get cronjob,job >> "$R/sao-luu/cronjob.txt" 2>&1
xong
ca "chep-ngoai-cum" bash -c "scripts/chep-sao-luu.sh /tmp/ngoai-cum > $R/sao-luu/chep-ngoai-cum.txt 2>&1"
ca "loi-sao-luu" scripts/loi-sao-luu.sh "$R/sao-luu/loi-sao-luu.txt"
ca "kt3-b" bash -c "scripts/kt3-mat-du-lieu.sh > $R/kt3-b.txt 2>&1"
cp k6/ket-qua/kt3-b-hoc-lieu.txt "$R/kt3-b-hoc-lieu.txt" 2>/dev/null
ca "so-sanh-sao-luu" scripts/so-sanh-sao-luu.sh "$R/sao-luu/so-sanh-sao-luu.csv" "$runs"
ca "pitr" bash -c "scripts/pitr.sh > $R/pitr.txt 2>&1"
failover_ca() {
  local dur=150s wait=45
  [ "$NHANH" = 1 ] && { dur=40s; wait=15; }
  scripts/do-gian-doan.sh "$R/failover-gian-doan.csv" > "$R/failover-gian-doan.txt" 2>&1 &
  local probe=$!
  scripts/k6.sh ghi-lien-tuc.js -e RATE=30 -e DURATION="$dur" > "$R/failover-ghi.log" 2>&1 &
  local writer=$!
  sleep "$wait"
  scripts/failover.sh crash > "$R/failover.txt" 2>&1
  wait "$writer"
  kill -TERM "$probe" 2>/dev/null
  wait "$probe" 2>/dev/null
  scripts/doi-chieu-ghi.sh "$R/failover-ghi.log" > "$R/failover-doi-chieu.txt" 2>&1
  sed -i '/DA_GHI/d; /^running (/d' "$R/failover-ghi.log"
}
ca "failover" failover_ca
