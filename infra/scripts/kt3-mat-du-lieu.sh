#!/usr/bin/env bash
# KT3-B: sao lưu, thêm 1 dòng sau lúc sao lưu, xoá hẳn CSDL và 1 tệp học liệu, khôi phục rồi đối chiếu.
# Dòng thêm sau sao lưu phải MẤT sau khi khôi phục: đó là bằng chứng RPO bằng thời điểm bản sao gần nhất.
# Chỉ chạy trên lab, script tự dừng nếu CSDL có tài khoản không phải dữ liệu giả.
#   scripts/kt3-mat-du-lieu.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PATH="$PWD/scripts:$PATH"

ns=hanni
pod=hanni-postgres-0
reader=doc-sao-luu
exec_pg() { kubectl -n "$ns" exec -i -c postgres "$pod" -- "$@"; }
sql() { exec_pg psql -U hanni -d hanni -Atc "$1"; }
tables='"User" "Word" "Lesson" "UserSettings" "MockExamAttempt" "ReviewLog"'
counts() { for table in $tables; do printf '%s=%s ' "$table" "$(sql "SELECT count(*) FROM $table")"; done; }

real=$(sql "SELECT count(*) FROM \"User\" WHERE email NOT LIKE '%@example.test'")
[ "$real" = 0 ] || { echo "CSDL có $real tài khoản không phải dữ liệu giả, dừng lại" >&2; exit 1; }

job=sao-luu-kt3-$(date +%s)
kubectl -n "$ns" create job --from=cronjob/hanni-backup "$job" >/dev/null
kubectl -n "$ns" wait --for=condition=complete "job/$job" --timeout=180s >/dev/null
backup_at=$(date '+%F %T')
before=$(counts)
echo "Sao lưu xong lúc $backup_at"
echo "Số dòng lúc sao lưu: $before"

sql 'CREATE TABLE IF NOT EXISTS moc_sau_sao_luu (ghi_chu text, luc timestamptz DEFAULT now())' >/dev/null
sql "INSERT INTO moc_sau_sao_luu (ghi_chu) VALUES ('ghi sau lúc sao lưu')" >/dev/null
sleep 2

started=$(date +%s)
echo "$(date +%T) sự cố: xoá CSDL và 1 tệp học liệu"
kubectl -n "$ns" scale deployment hanni-api hanni-worker --replicas=0 >/dev/null
exec_pg psql -U hanni -d postgres -qc 'DROP DATABASE hanni WITH (FORCE)'
victim=media/out/nghe-mau/doan-nghe.mp3
rm -f "$victim"

kubectl -n "$ns" delete pod "$reader" --ignore-not-found >/dev/null
kubectl -n "$ns" run "$reader" --image=postgres:16-alpine --restart=Never --labels=app=hanni-backup \
  --overrides='{"spec":{"containers":[{"name":"doc-sao-luu","image":"postgres:16-alpine","command":["sleep","600"],
    "volumeMounts":[{"name":"backup","mountPath":"/backup"}]}],
    "volumes":[{"name":"backup","persistentVolumeClaim":{"claimName":"hanni-backup"}}]}}' >/dev/null
trap 'kubectl -n "$ns" delete pod "$reader" --ignore-not-found --wait=false >/dev/null' EXIT
kubectl -n "$ns" wait --for=condition=Ready "pod/$reader" --timeout=60s >/dev/null

dump=$(kubectl -n "$ns" exec "$reader" -- sh -c 'ls -1t /backup/hanni-*.dump | head -1')
stamp=${dump#/backup/hanni-}; stamp=${stamp%.dump}
kubectl -n "$ns" exec "$reader" -- sh -c "cd /backup && sha256sum -c hanni-$stamp.sha256"
exec_pg psql -U hanni -d postgres -qc 'CREATE DATABASE hanni'
kubectl -n "$ns" exec "$reader" -- cat "$dump" | exec_pg pg_restore -U hanni -d hanni --no-owner
kubectl -n "$ns" exec "$reader" -- cat "/backup/hoc-lieu-$stamp.tar.gz" | tar -xzf - -C media/out --strip-components=1

kubectl -n "$ns" scale deployment hanni-api --replicas=2 >/dev/null
kubectl -n "$ns" scale deployment hanni-worker --replicas=2 >/dev/null
kubectl -n "$ns" rollout status deployment/hanni-api --timeout=240s >/dev/null
until [ "$(curl -s -m 2 -o /dev/null -w '%{http_code}' http://api.hanni.localhost:18080/api/health/ready)" = 200 ]; do sleep 1; done
after=$(counts)
echo "Số dòng sau khôi phục: $after"
[ "$before" = "$after" ] && echo 'Số dòng: KHỚP' || echo 'Số dòng: LỆCH'
marker=$(sql "SELECT count(*) FROM information_schema.tables WHERE table_name = 'moc_sau_sao_luu'")
echo "Dòng ghi sau lúc sao lưu còn tồn tại: $marker (0 nghĩa là mất đúng như RPO của bản dump)"
scripts/kt1.sh k6/ket-qua/kt3-b-hoc-lieu.txt | tail -1
echo "RTO, từ lúc xoá tới khi kiểm tra xong: $(( $(date +%s) - started )) giây"
