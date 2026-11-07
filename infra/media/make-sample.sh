#!/usr/bin/env bash
# Tạo 3 học liệu từ slide tự làm và ghi âm mở (CC BY-SA 4.0): video HLS 2 mức, PDF, MP3, rồi ghi manifest kèm SHA-256.
# ffmpeg, python đều chạy trong Docker. Kết quả ở infra/media/out (đã gitignore), k3d gắn vào node tại /srv/hoc-lieu.
set -euo pipefail

cd "$(dirname "$0")"
out=$PWD/out
mkdir -p "$out/video-mau/540p" "$out/video-mau/720p" "$out/bang-phien-am" "$out/nghe-mau"

ffmpeg() {
  docker run --rm -u "$(id -u)" -v "$out:/out" -v "$PWD/nguon:/nguon:ro" -v "$PWD/../../assets/audio:/audio:ro" \
    --entrypoint /usr/local/bin/ffmpeg linuxserver/ffmpeg:7.1.1 -hide_banner -loglevel error -y "$@"
}

py() {
  docker run --rm -i -u "$(id -u)" -v "$out:/out" -v "$PWD/../k8s:/k8s" python:3.13-alpine python - "$@"
}

tam=$out/.tam
mkdir -p "$tam"

# R1: bài giảng 66 giây, 6 slide, mỗi slide 11 giây, phát ghi âm thật. Chọn âm "shi" vì đủ 4 thanh có ghi âm.
ffmpeg -loop 1 -framerate 30 -t 11 -i /nguon/slide-1.png -f lavfi -t 11 -i anullsrc=r=44100:cl=mono \
  -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac -shortest /out/.tam/phan-1.mp4

i=2
for chu in 诗 十 使 事; do
  ffmpeg -loop 1 -framerate 30 -t 11 -i "/nguon/slide-$i.png" -f lavfi -t 11 -i anullsrc=r=44100:cl=mono -i "/audio/cmn-$chu.mp3" -filter_complex \
    "[2:a]aresample=44100,aformat=channel_layouts=mono,asplit=3[x][y][z];[x]adelay=1000:all=1[a];[y]adelay=4500:all=1[b];[z]adelay=8000:all=1[c];[1:a][a][b][c]amix=inputs=4:duration=first:normalize=0[o]" \
    -map 0:v -map "[o]" -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac "/out/.tam/phan-$i.mp4"
  i=$((i + 1))
done

ffmpeg -loop 1 -framerate 30 -t 11 -i /nguon/slide-6.png -f lavfi -t 11 -i anullsrc=r=44100:cl=mono -i /audio/cmn-诗.mp3 -i /audio/cmn-十.mp3 -i /audio/cmn-使.mp3 -i /audio/cmn-事.mp3 \
  -filter_complex "[2:a]aresample=44100,aformat=channel_layouts=mono,adelay=1000:all=1[a];[3:a]aresample=44100,aformat=channel_layouts=mono,adelay=3500:all=1[b];[4:a]aresample=44100,aformat=channel_layouts=mono,adelay=6000:all=1[c];[5:a]aresample=44100,aformat=channel_layouts=mono,adelay=8500:all=1[d];[1:a][a][b][c][d]amix=inputs=5:duration=first:normalize=0[o]" \
  -map 0:v -map "[o]" -pix_fmt yuv420p -c:v libx264 -preset veryfast -c:a aac /out/.tam/phan-6.mp4

for i in 1 2 3 4 5 6; do echo "file '/out/.tam/phan-$i.mp4'"; done > "$tam/ds.txt"
ffmpeg -f concat -safe 0 -i /out/.tam/ds.txt -c copy /out/.tam/bai-giang.mp4

# Chia đoạn 6 giây, giữ đúng bitrate trong bảng tính: 540p 2 Mbps, 720p 3 Mbps. Slide tĩnh nén rất nhỏ nên phải ép CBR,
# nếu không số đo băng thông video không còn đúng với bảng tính.
for rung in 540p:960x540:2000k 720p:1280x720:3000k; do
  IFS=: read -r name size rate <<< "$rung"
  ffmpeg -i /out/.tam/bai-giang.mp4 -vf "scale=$size" \
    -c:v libx264 -preset veryfast -b:v "$rate" -minrate "$rate" -maxrate "$rate" -bufsize "$rate" \
    -x264-params nal-hrd=cbr:force-cfr=1 -g 180 -keyint_min 180 -sc_threshold 0 -c:a aac -b:a 128k \
    -f hls -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "/out/video-mau/$name/seg-%03d.ts" "/out/video-mau/$name/index.m3u8"
done

cat > "$out/video-mau/master.m3u8" <<'EOF2'
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2128000,RESOLUTION=960x540
540p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3128000,RESOLUTION=1280x720
720p/index.m3u8
EOF2

# Bản MP4 cùng thư mục để so sánh HLS với tải trực tiếp, chữ ký theo thư mục nên dùng chung liên kết.
ffmpeg -i /out/.tam/bai-giang.mp4 -vf scale=1280x720 -c:v libx264 -preset veryfast -b:v 3000k -minrate 3000k -maxrate 3000k \
  -bufsize 3000k -x264-params nal-hrd=cbr -c:a aac -b:a 128k -movflags +faststart /out/video-mau/bai-giang-720p.mp4

# R3: gói nghe bài 1, mỗi từ 1 lần, nghỉ 1,5 giây để đọc theo.
: > "$tam/nghe.txt"
n=0
for tu in 你好 谢谢 不客气 对不起 请 请问 再见 喂 没事 没关系; do
  n=$((n + 1))
  ffmpeg -i "/audio/cmn-$tu.mp3" -af apad=pad_dur=1.5,aresample=44100,aformat=channel_layouts=mono "/out/.tam/t-$n.wav"
  echo "file '/out/.tam/t-$n.wav'" >> "$tam/nghe.txt"
done
ffmpeg -f concat -safe 0 -i /out/.tam/nghe.txt -c:a libmp3lame -b:a 128k /out/nghe-mau/doan-nghe.mp3

# R2: PDF đã in sẵn từ dữ liệu từ vựng, nguồn ghi ở cuối tệp.
cp nguon/bang-phien-am.pdf "$out/bang-phien-am/bang-phien-am.pdf"
rm -rf "$tam"

py /out /k8s/media-manifest.json <<'PY'
import hashlib, json, os, sys
root, target = sys.argv[1:3]

def size_of(folder):
    return sum(os.path.getsize(os.path.join(d, f)) for d, _, files in os.walk(folder) for f in files)

def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()

items = [
    ("video-mau", "Bốn thanh điệu tiếng Trung", "Bài giảng 66 giây, hai mức chất lượng", "video", "master.m3u8", True),
    ("bang-phien-am", "Bảng phiên âm và từ vựng HSK 1", "Tệp PDF 6 trang để in và học", "pdf", "bang-phien-am.pdf", False),
    ("nghe-mau", "Gói nghe bài 1: Chào hỏi", "10 từ, nghỉ giữa các từ để đọc theo", "audio", "doan-nghe.mp3", False),
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

# Mã băm mọi tệp để KT1 đối chiếu: sha256sum -c manifest.sha256
(cd "$out" && find . -type f ! -name manifest.sha256 -print0 | sort -z | xargs -0 sha256sum > manifest.sha256)
