#!/usr/bin/env bash
# KT3-A: dừng hẳn API rồi bật lại, đo gián đoạn và thời gian cảnh báo kêu, sau đó kiểm tra học liệu còn đúng.
#   scripts/kt3-dung-dich-vu.sh k6/ket-qua/kt3 3
set -uo pipefail
cd "$(dirname "$0")/.."
PATH="$PWD/scripts:$PATH"

out=${1:?Cần thư mục kết quả}
runs=${2:-3}
mkdir -p "$out"
echo 'lan,bat_dau,tat_toi_canh_bao_bien_giay,tat_toi_canh_bao_api_giay,bat_lai_toi_tra_loi_giay,gian_doan_giay,hoc_lieu' > "$out/kt3-a.csv"

active() {
  kubectl -n observability exec deploy/prometheus -- wget -qO- http://alertmanager:9093/api/v2/alerts 2>/dev/null |
    python3 -c "import json,sys; print(' '.join(a['labels']['alertname'] for a in json.load(sys.stdin) if a['status']['state']=='active'))" 2>/dev/null
}

for run in $(seq 1 "$runs"); do
  URL=http://api.hanni.localhost:18080/api/health/ready scripts/do-gian-doan.sh "$out/lan-$run.csv" > "$out/lan-$run.txt" 2>&1 &
  probe=$!
  sleep 5
  started=$(date -u +%FT%TZ)
  t0=$(date +%s)
  kubectl -n hanni scale deployment hanni-api --replicas=0 >/dev/null
  edge=-
  api=-
  for _ in $(seq 1 60); do
    now=$(active)
    [[ "$edge" = - && " $now " == *" HanniEdgeDown "* ]] && edge=$(( $(date +%s) - t0 ))
    [[ "$api" = - && " $now " == *" HanniApiDown "* ]] && api=$(( $(date +%s) - t0 ))
    [[ "$edge" != - && "$api" != - ]] && break
    sleep 5
  done
  t1=$(date +%s)
  kubectl -n hanni scale deployment hanni-api --replicas=2 >/dev/null
  until [ "$(curl -s -m 1 -o /dev/null -w '%{http_code}' http://api.hanni.localhost:18080/api/health/ready)" = 200 ]; do sleep 0.5; done
  back=$(( $(date +%s) - t1 ))
  sleep 3
  kill -TERM "$probe" 2>/dev/null
  wait "$probe" 2>/dev/null
  down=$(awk -F, 'NR > 1 && $2 != 200 {n++} END {print n + 0}' "$out/lan-$run.csv")
  media=sai
  scripts/kt1.sh "$out/lan-$run-hoc-lieu.txt" >/dev/null 2>&1 && media=dung
  echo "$run,$started,$edge,$api,$back,$down,$media" >> "$out/kt3-a.csv"
  echo "$(date +%T) lần $run: biên $edge giây, API $api giây, bật lại $back giây, gián đoạn $down giây, học liệu $media"
  # Chờ cảnh báo hết kêu rồi mới đo lần sau, nếu không lần sau đọc nhầm cảnh báo cũ.
  until ! active | grep -qE 'HanniEdgeDown|HanniApiDown'; do sleep 5; done
done
