#!/usr/bin/env bash
# So sánh sao lưu logic (pg_dump) với sao lưu vật lý (pg_basebackup) trên cùng CSDL lab: thời gian sao lưu, dung lượng,
# thời gian khôi phục, số dòng sau khôi phục. Khôi phục vào nơi tạm, không chạm CSDL đang phục vụ.
#   scripts/so-sanh-sao-luu.sh k6/ket-qua/so-sanh-sao-luu.csv 3
set -uo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

out=${1:?Cần tệp CSV}
runs=${2:-3}
in_pod() { kubectl -n hanni exec -i -c postgres hanni-postgres-0 -- "$@"; }
count() { in_pod sh -c "$1" | tr -dc 0-9; }
mkdir -p "$(dirname "$out")"
echo 'lan,cach,sao_luu_giay,dung_luong_mb,khoi_phuc_giay,dong_ReviewLog_goc,dong_ReviewLog_khoi_phuc' > "$out"
now() { date +%s.%N; }
dt() { python3 -c "print(round($2 - $1, 2))"; }

for run in $(seq 1 "$runs"); do
  rows=$(count "psql -U hanni -d hanni -Atc 'SELECT count(*) FROM \"ReviewLog\"'")

  t0=$(now); in_pod sh -c 'pg_dump -U hanni -d hanni -Fc -f /wal-archive/so-sanh.dump'; t1=$(now)
  size=$(in_pod sh -c 'du -m /wal-archive/so-sanh.dump | cut -f1')
  in_pod psql -U hanni -d postgres -qc 'DROP DATABASE IF EXISTS hanni_so_sanh' >/dev/null
  t2=$(now)
  in_pod psql -U hanni -d postgres -qc 'CREATE DATABASE hanni_so_sanh' >/dev/null
  in_pod pg_restore -U hanni -d hanni_so_sanh --no-owner /wal-archive/so-sanh.dump
  t3=$(now)
  got=$(count "psql -U hanni -d hanni_so_sanh -Atc 'SELECT count(*) FROM \"ReviewLog\"'")
  echo "$run,pg_dump,$(dt "$t0" "$t1"),$size,$(dt "$t2" "$t3"),$rows,$got" | tee -a "$out"
  in_pod psql -U hanni -d postgres -qc 'DROP DATABASE hanni_so_sanh' >/dev/null
  in_pod rm -f /wal-archive/so-sanh.dump

  in_pod sh -c 'rm -rf /wal-archive/so-sanh-bb /wal-archive/so-sanh-kp'
  t0=$(now); in_pod sh -c 'su-exec postgres pg_basebackup -U hanni -D /wal-archive/so-sanh-bb -X stream -c fast'; t1=$(now)
  size=$(in_pod sh -c 'du -sm /wal-archive/so-sanh-bb | cut -f1')
  t2=$(now)
  in_pod sh -c 'cp -a /wal-archive/so-sanh-bb /wal-archive/so-sanh-kp && chown -R postgres /wal-archive/so-sanh-kp && chmod 700 /wal-archive/so-sanh-kp && rm -f /wal-archive/so-sanh-kp/standby.signal &&
    su-exec postgres pg_ctl -D /wal-archive/so-sanh-kp -w -t 120 -o "-p 5546 -c shared_buffers=32MB -c archive_mode=off -c max_connections=20 -c listen_addresses= -c unix_socket_directories=/tmp" start >/dev/null'
  t3=$(now)
  got=$(count "psql -h /tmp -p 5546 -U hanni -d hanni -Atc 'SELECT count(*) FROM \"ReviewLog\"'")
  echo "$run,pg_basebackup,$(dt "$t0" "$t1"),$size,$(dt "$t2" "$t3"),$rows,$got" | tee -a "$out"
  in_pod sh -c 'su-exec postgres pg_ctl -D /wal-archive/so-sanh-kp -m fast stop >/dev/null; rm -rf /wal-archive/so-sanh-bb /wal-archive/so-sanh-kp'
done
