#!/usr/bin/env bash
# Diễn tập khôi phục theo thời điểm (PITR): lỡ tay xoá dữ liệu lúc T, dựng lại CSDL đúng tới ngay trước T từ bản sao vật lý
# cộng WAL. pg_dump hằng ngày thì mất tới 24 giờ, cách này chỉ mất phần WAL chưa kịp lưu, tức tối đa archive_timeout.
# Khôi phục vào 1 tiến trình Postgres tạm ở cổng khác, không chạm CSDL đang phục vụ.
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

in_pod() { kubectl -n hanni exec -i -c postgres hanni-postgres-0 -- "$@"; }
sql() { in_pod psql -U hanni -d hanni -Atc "$1"; }

base=/wal-archive/base
tmp=/wal-archive/khoi-phuc

echo "Tạo bản sao vật lý"
in_pod sh -c "rm -rf $base $tmp && su-exec postgres pg_basebackup -U hanni -D $base -X none -c fast"

sql 'DROP TABLE IF EXISTS du_lieu_quan_trong'
sql 'CREATE TABLE du_lieu_quan_trong AS SELECT generate_series(1, 1000) AS so'
sql 'SELECT pg_switch_wal()' >/dev/null
sleep 3
target=$(sql "SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || '+00'")
sleep 3
echo "Lỡ tay xoá lúc sau $target"
sql 'TRUNCATE du_lieu_quan_trong'
sql 'SELECT pg_switch_wal()' >/dev/null
echo "Trên CSDL đang chạy còn: $(sql 'SELECT count(*) FROM du_lieu_quan_trong') dòng"
sleep 2

started=$(date +%s)
in_pod sh -s <<SH
set -e
cp -a $base $tmp
chown -R postgres $tmp
chmod 700 $tmp
cat >> $tmp/postgresql.auto.conf <<CONF
restore_command = 'cp /wal-archive/%f %p'
recovery_target_time = '$target'
recovery_target_action = 'promote'
CONF
touch $tmp/recovery.signal
su-exec postgres pg_ctl -D $tmp -w -t 120 -o "-p 5544 -c shared_buffers=32MB -c archive_mode=off -c max_connections=60 -c listen_addresses='' -c unix_socket_directories=/tmp" start >/dev/null
SH
result=$(in_pod sh -c "psql -h /tmp -p 5544 -U hanni -d hanni -Atc 'SELECT count(*) FROM du_lieu_quan_trong'")
echo "Sau khôi phục: $result dòng, mất $(( $(date +%s) - started )) giây"
in_pod sh -c "su-exec postgres pg_ctl -D $tmp -m fast stop >/dev/null; rm -rf $tmp"
sql 'DROP TABLE du_lieu_quan_trong'
[ "$result" = 1000 ] || { echo "KHÔNG khớp" >&2; exit 1; }
