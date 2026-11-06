#!/usr/bin/env bash
# Khôi phục bản sao lưu mới nhất vào CSDL SẠCH hanni_khoi_phuc rồi so số dòng với CSDL đang chạy.
# Không chạm dữ liệu đang phục vụ. Luôn chạy trên lab vì kubectl ở đây là scripts/kubectl, trỏ vào container k3s.
#   ./restore.sh
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

started=$(date +%s)
pod=hanni-postgres-0
ns=hanni
exec_pg() { kubectl -n "$ns" exec -i -c postgres "$pod" -- "$@"; }

reader=doc-sao-luu
kubectl -n "$ns" delete pod "$reader" --ignore-not-found >/dev/null
kubectl -n "$ns" run "$reader" --image=postgres:16-alpine --restart=Never \
  --labels=app=hanni-backup \
  --overrides='{"spec":{"containers":[{"name":"doc-sao-luu","image":"postgres:16-alpine","command":["sleep","600"],
    "volumeMounts":[{"name":"backup","mountPath":"/backup"}]}],
    "volumes":[{"name":"backup","persistentVolumeClaim":{"claimName":"hanni-backup"}}]}}' >/dev/null
trap 'kubectl -n "$ns" delete pod "$reader" --ignore-not-found --wait=false >/dev/null' EXIT
kubectl -n "$ns" wait --for=condition=Ready "pod/$reader" --timeout=60s >/dev/null

dump=$(kubectl -n "$ns" exec "$reader" -- sh -c 'ls -1t /backup/hanni-*.dump | head -1')
stamp=${dump#/backup/hanni-}; stamp=${stamp%.dump}
echo "Bản sao lưu: $dump"
kubectl -n "$ns" exec "$reader" -- sh -c "cd /backup && sha256sum -c hanni-$stamp.sha256"

exec_pg psql -U hanni -d postgres -qc 'DROP DATABASE IF EXISTS hanni_khoi_phuc'
exec_pg psql -U hanni -d postgres -qc 'CREATE DATABASE hanni_khoi_phuc'
kubectl -n "$ns" exec "$reader" -- cat "$dump" | exec_pg pg_restore -U hanni -d hanni_khoi_phuc --no-owner

tables='"User" "Word" "Lesson" "UserSettings" "MockExamAttempt" "ReviewLog"'
fail=0
for table in $tables; do
  live=$(exec_pg psql -U hanni -d hanni -Atc "SELECT count(*) FROM $table")
  restored=$(exec_pg psql -U hanni -d hanni_khoi_phuc -Atc "SELECT count(*) FROM $table")
  printf '%-20s đang chạy %-8s khôi phục %-8s\n' "$table" "$live" "$restored"
  [ "$live" = "$restored" ] || fail=1
done

echo "Thời gian khôi phục: $(( $(date +%s) - started )) giây"
[ "$fail" = 0 ] || echo 'Lệch số dòng: bình thường nếu có ghi mới sau lúc sao lưu, phải giải thích được.'
