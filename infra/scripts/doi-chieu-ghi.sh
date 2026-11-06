#!/usr/bin/env bash
# Sau failover: lấy các lượt server đã xác nhận (log của k6/ghi-lien-tuc.js), đếm lượt không còn trên leader mới.
#   ./doi-chieu-ghi.sh ket-qua/ghi.log
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

log=${1:?Cần log của k6/ghi-lien-tuc.js}
acked=$(mktemp)
stored=$(mktemp)
trap 'rm -f "$acked" "$stored"' EXIT

grep -o 'DA_GHI [^" ]*' "$log" | cut -d' ' -f2 | sort -u > "$acked"
kubectl -n hanni exec -c postgres hanni-postgres-replica-0 -- psql -U hanni -d hanni -Atc 'SELECT id FROM "MockExamAttempt"' | sort -u > "$stored"
echo "Server đã xác nhận: $(wc -l < "$acked") lượt"
echo "Mất trên leader mới: $(comm -23 "$acked" "$stored" | wc -l) lượt"
