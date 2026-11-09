# Dùng chung cho các job đo trên GitHub Actions. Nạp bằng: . ci/chung.sh
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
PATH="$PWD/scripts:$PATH"
R=k6/ket-qua
mkdir -p "$R"
NHANH=${NHANH:-0}

# Ghi máy đo vào kết quả: số đo chỉ đúng cho đúng phần cứng này.
{
  echo "Thời điểm: $(date '+%F %T %z')"
  echo "Commit: $(git rev-parse --short HEAD)"
  echo "Máy: GitHub Actions $(. /etc/os-release; echo "$PRETTY_NAME"), $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs), $(nproc) luồng, $(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo) MB RAM"
  echo "Docker: $(docker version --format '{{.Server.Version}}')"
  echo "k6 chạy chung máy với hệ thống, đi qua loopback tới ingress Traefik"
  [ "$NHANH" = 1 ] && echo "CHẾ ĐỘ THỬ NHANH: thời lượng rút ngắn, chỉ để kiểm tra script, KHÔNG dùng làm số đo"
} > "$R/may-do.txt"

buoc() { echo "::group::$(date +%T) $*"; }
xong() { echo "::endgroup::"; }

# Chạy 1 lệnh, ghi mã thoát, không dừng cả job khi 1 ca lỗi.
ca() {
  local name=$1
  shift
  buoc "$name"
  local start
  start=$(date +%s)
  "$@"
  local code=$?
  echo "$name,$code,$(( $(date +%s) - start ))" >> "$R/cac-ca.csv"
  xong
  return 0
}

# Xuất chỉ số Prometheus cho 1 khoảng thời gian, chạy sau khi ca kết thúc.
chi_so() { scripts/xuat-chi-so.py "$1" "$2" "$3" || true; }

co_dinh_api() {
  kubectl -n hanni patch hpa hanni-api --type merge -p "{\"spec\":{\"minReplicas\":$1,\"maxReplicas\":$2}}" >/dev/null
  [ "$1" = "$2" ] && scripts/cho-du-ban.sh "$1"
  return 0
}
