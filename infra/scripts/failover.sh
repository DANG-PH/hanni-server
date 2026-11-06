#!/usr/bin/env bash
# Diễn tập mất leader: tắt Postgres chính, đưa bản sao lên làm leader, trỏ PgBouncer sang. In thời gian và dữ liệu mất.
# Chạy do-gian-doan.sh ở cửa sổ khác. Làm xong muốn trở lại ban đầu: make down rồi dựng lại.
#
# Thứ tự quan trọng: PHẢI tắt hẳn leader cũ trước khi đưa bản sao lên. Cả 2 cùng nhận ghi là split brain (DDIA ch. 8),
# dữ liệu rẽ nhánh và không gộp lại được. Bước scale về 0 chính là cách "rào" leader cũ.
#
# Mặc định tắt êm: Postgres đẩy nốt WAL rồi mới dừng nên không mất gì, chưa nói lên điều gì về RPO. Chạy `./failover.sh crash`
# để giết bằng SIGKILL như mất điện, kèm k6/ghi-lien-tuc.js rồi doi-chieu-ghi.sh để đếm lượt đã xác nhận mà bị mất.
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

ns=hanni
replica=hanni-postgres-replica-0
sql() { kubectl -n "$ns" exec -c postgres "$1" -- psql -U hanni -d hanni -Atc "$2"; }

echo "Độ trễ sao chép trước khi hỏng:"
sql hanni-postgres-0 "SELECT application_name, state, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS tre_byte FROM pg_stat_replication"
before=$(sql hanni-postgres-0 'SELECT count(*) FROM "MockExamAttempt"')
echo "Lượt thi trên leader: $before"

started=$(date +%s)
echo "$(date +%T) tắt leader (${1:-êm})"
if [ "${1:-}" = crash ]; then
  service=$(kubectl -n "$ns" get pod hanni-postgres-0 -o jsonpath='{.spec.nodeName}')
  service=${service#k3s-}
  cd "$(dirname "$0")/.."
  id=$(docker compose exec -T "$service" crictl ps -q --name '^postgres$' --label io.kubernetes.pod.name=hanni-postgres-0)
  docker compose exec -T "$service" crictl stop --timeout 0 "$id" >/dev/null
fi
kubectl -n "$ns" scale statefulset hanni-postgres --replicas=0 >/dev/null
kubectl -n "$ns" wait --for=delete pod/hanni-postgres-0 --timeout=90s >/dev/null

echo "$(date +%T) đưa bản sao lên làm leader"
sql "$replica" 'SELECT pg_promote(true, 30)' >/dev/null

echo "$(date +%T) trỏ PgBouncer ghi sang leader mới"
kubectl -n "$ns" set env deployment/hanni-pgbouncer DB_HOST=hanni-postgres-replica >/dev/null
kubectl -n "$ns" rollout status deployment/hanni-pgbouncer --timeout=90s >/dev/null

after=$(sql "$replica" 'SELECT count(*) FROM "MockExamAttempt"')
echo "Lượt thi trên leader mới: $after (trước khi tắt đọc được $before; đang có tải ghi thì đếm mất bằng doi-chieu-ghi.sh)"
echo "Thời gian từ lúc tắt tới khi trỏ xong: $(( $(date +%s) - started )) giây"
