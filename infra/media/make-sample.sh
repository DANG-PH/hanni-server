#!/usr/bin/env bash
# Tạo học liệu mẫu tự làm (không dính bản quyền): video HLS 2 mức, PDF, MP3, rồi ghi manifest kèm SHA-256.
# ffmpeg, python đều chạy trong Docker. Kết quả ở infra/media/out (đã gitignore), k3d gắn vào node tại /srv/hoc-lieu.
set -euo pipefail

cd "$(dirname "$0")"
out=$PWD/out
mkdir -p "$out/video-mau/540p" "$out/video-mau/720p" "$out/bang-phien-am" "$out/nghe-mau"

ffmpeg() {
  docker run --rm -u "$(id -u)" -v "$out:/out" linuxserver/ffmpeg:7.1.1 -hide_banner -loglevel error -y "$@"
}

py() {
  docker run --rm -i -u "$(id -u)" -v "$out:/out" -v "$PWD/../k8s:/k8s" python:3.13-alpine python - "$@"
}

# 60 giây, chia đoạn 6 giây đúng mức bitrate trong bảng tính: 540p 2 Mbps, 720p 3 Mbps.
for rung in 540p:960x540:2000k 720p:1280x720:3000k; do
  IFS=: read -r name size rate <<< "$rung"
  ffmpeg -f lavfi -i "testsrc2=size=$size:rate=30" -f lavfi -i "sine=frequency=440" -t 60 \
    -c:v libx264 -preset veryfast -b:v "$rate" -maxrate "$rate" -bufsize "$rate" -g 180 -keyint_min 180 \
    -sc_threshold 0 -c:a aac -b:a 128k \
    -f hls -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "/out/video-mau/$name/seg-%03d.ts" "/out/video-mau/$name/index.m3u8"
done

cat > "$out/video-mau/master.m3u8" <<'EOF'
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2128000,RESOLUTION=960x540
540p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3128000,RESOLUTION=1280x720
720p/index.m3u8
EOF

ffmpeg -f lavfi -i "sine=frequency=220" -t 30 -c:a libmp3lame -b:a 128k /out/nghe-mau/doan-nghe.mp3

# PDF tối giản viết tay đúng định dạng, không cần cài công cụ.
py /out/bang-phien-am/bang-phien-am.pdf <<'PY'
import sys
text = b"BT /F1 24 Tf 72 720 Td (Bang phien am mau - du lieu lab) Tj ET"
objs = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    b"<< /Length %d >>\nstream\n%s\nendstream" % (len(text), text),
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
]
out, offsets = b"%PDF-1.4\n", []
for i, obj in enumerate(objs, 1):
    offsets.append(len(out))
    out += b"%d 0 obj\n%s\nendobj\n" % (i, obj)
xref = len(out)
out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
for off in offsets:
    out += b"%010d 00000 n \n" % off
out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
open(sys.argv[1], "wb").write(out)
PY

py /out /k8s/media-manifest.json <<'PY'
import hashlib, json, os, sys
root, target = sys.argv[1:3]

def size_of(folder):
    return sum(os.path.getsize(os.path.join(d, f)) for d, _, files in os.walk(folder) for f in files)

def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()

items = [
    ("video-mau", "Video mẫu", "Video thử 60 giây, hai mức chất lượng", "video", "master.m3u8", True),
    ("bang-phien-am", "Bảng phiên âm", "Tệp PDF để in và học", "pdf", "bang-phien-am.pdf", False),
    ("nghe-mau", "Đoạn nghe mẫu", "Tệp MP3 30 giây", "audio", "doan-nghe.mp3", True),
]
manifest = [{
    "id": rid, "title": title, "description": desc, "kind": kind, "dir": rid, "file": name,
    "bytes": size_of(os.path.join(root, rid)),
    "sha256": None if kind == "video" else sha(os.path.join(root, rid, name)),
    "requiresLogin": login,
} for rid, title, desc, kind, name, login in items]
json.dump(manifest, open(target, "w", encoding="utf8"), ensure_ascii=False, indent=2)
print(json.dumps(manifest, ensure_ascii=False)[:400])
PY
