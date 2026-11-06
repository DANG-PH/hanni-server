#!/bin/sh
# Sao lưu CSDL + học liệu vào /backup. Chạy trong CronJob hanni-backup.
# Script tự kiểm tra bản vừa tạo và báo lỗi bằng mã thoát, để CronJob đỏ thay vì âm thầm giữ tệp hỏng.
set -eu

stamp=$(date -u +%Y%m%d-%H%M%S)
dump="/backup/hanni-$stamp.dump"
media="/backup/hoc-lieu-$stamp.tar.gz"
log() { echo "$(date -u +%FT%TZ) $*"; }

# Luật NetworkPolicy cho pod mới cần vài giây mới có hiệu lực, kết nối ngay lúc khởi động sẽ bị từ chối.
tries=0
until pg_isready --quiet --timeout=2; do
  tries=$((tries + 1))
  [ "$tries" -lt 30 ] || { log "không kết nối được CSDL"; exit 1; }
  sleep 2
done

log "bắt đầu sao lưu CSDL"
pg_dump --format=custom --no-owner --file="$dump.tmp"
pg_restore --list "$dump.tmp" >/dev/null
mv "$dump.tmp" "$dump"

log "bắt đầu sao lưu học liệu"
tar -czf "$media.tmp" -C /srv hoc-lieu
tar -tzf "$media.tmp" >/dev/null
mv "$media.tmp" "$media"

(cd /backup && sha256sum "$(basename "$dump")" "$(basename "$media")" > "hanni-$stamp.sha256")

keep=${BACKUP_KEEP:-14}
for pattern in 'hanni-*.dump' 'hoc-lieu-*.tar.gz' 'hanni-*.sha256'; do
  # shellcheck disable=SC2086
  ls -1t /backup/$pattern 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
    rm -f -- "$old"
  done
done

log "xong: $(du -h "$dump" | cut -f1) CSDL, $(du -h "$media" | cut -f1) học liệu"
