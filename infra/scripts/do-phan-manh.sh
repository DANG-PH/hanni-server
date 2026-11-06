#!/usr/bin/env bash
# Đo chia ReviewLog theo tháng: sinh dữ liệu giả, đo truy vấn điểm giải đấu tuần trước và sau khi chia.
#   ./do-phan-manh.sh 1000000
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

rows=${1:-1000000}
psql_lab() { kubectl -n hanni exec -i -c postgres hanni-postgres-0 -- psql -U hanni -d hanni "$@"; }

# Đúng dạng truy vấn tính điểm giải đấu tuần, chạy 1 lần mỗi giờ khi chốt tuần.
query=$(cat <<'SQL'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT "userId", count(*) FROM "ReviewLog"
WHERE "reviewedAt" >= now() - interval '7 days' AND "reviewedAt" < now()
GROUP BY "userId";
SQL
)

report() {
  echo "== $1"
  for _ in 1 2 3; do psql_lab -Atc "$query" | grep -E 'Execution Time'; done
  psql_lab -Atc "$query" | grep -cE 'Scan on|Scan using' | sed 's/^/số bảng phải quét: /'
}

echo "Sinh $rows dòng giả"
psql_lab -v so_dong="$rows" < "$(dirname "$0")/../sql/sinh-review-log.sql"
report 'Chưa chia'

echo 'Chia theo tháng'
time psql_lab < "$(dirname "$0")/../sql/chia-review-log.sql"
report 'Đã chia'
psql_lab -Atc "SELECT count(*) || ' phần' FROM pg_inherits WHERE inhparent = '\"ReviewLog\"'::regclass"
