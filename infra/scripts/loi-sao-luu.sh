#!/usr/bin/env bash
# Thử sao lưu khi có lỗi: đích hết chỗ, đích không ghi được, CSDL không tới được. Script sao lưu phải dừng, báo lỗi rõ,
# trả mã khác 0 và không làm hỏng các bản sao lưu cũ.
#   scripts/loi-sao-luu.sh k6/ket-qua/loi-sao-luu.txt
set -uo pipefail
cd "$(dirname "$0")/.."
PATH="$PWD/scripts:$PATH"

out=${1:?Cần tệp kết quả}
ns=hanni
mkdir -p "$(dirname "$out")"
: > "$out"
fail=0

count_backups() {
  kubectl -n "$ns" run dem-sao-luu --rm -i --restart=Never --image=postgres:16-alpine --labels=app=hanni-backup \
    --overrides='{"spec":{"containers":[{"name":"dem-sao-luu","image":"postgres:16-alpine","command":["sh","-c","ls /backup/*.dump 2>/dev/null | wc -l"],
      "volumeMounts":[{"name":"backup","mountPath":"/backup"}]}],
      "volumes":[{"name":"backup","persistentVolumeClaim":{"claimName":"hanni-backup"}}]}}' 2>/dev/null | tr -dc 0-9
}

run_case() {  # $1 = tên, $2 = đoạn python sửa pod spec của job
  local name=$1 patch=$2
  kubectl -n "$ns" get cronjob hanni-backup -o json | python3 -c "
import json, sys
cj = json.load(sys.stdin)
job = {'apiVersion': 'batch/v1', 'kind': 'Job', 'metadata': {'name': '$name'}, 'spec': cj['spec']['jobTemplate']['spec']}
job['spec']['backoffLimit'] = 0
spec = job['spec']['template']['spec']
c = spec['containers'][0]
$patch
print(json.dumps(job))" | kubectl -n "$ns" create -f - >/dev/null
  for _ in $(seq 1 60); do
    state=$(kubectl -n "$ns" get job "$name" -o jsonpath='{range .status.conditions[*]}{.type}={.status} {end}')
    [[ "$state" == *"Failed=True"* || "$state" == *"Complete=True"* ]] && break
    sleep 3
  done
  local result=hoàn-thành
  [[ "$state" == *"Failed=True"* ]] && result=thất-bại
  local log
  log=$(kubectl -n "$ns" logs "job/$name" 2>&1 | tail -4 | tr '\n' ' ')
  local verdict=ĐẠT
  [ "$result" = thất-bại ] || { verdict=SAI; fail=1; }
  printf '%s | job %s | log: %s | %s\n' "$name" "$result" "$log" "$verdict" | tee -a "$out"
  kubectl -n "$ns" delete job "$name" --wait=false >/dev/null
}

echo "Thử lỗi sao lưu lúc $(date '+%F %T %z')" | tee -a "$out"
before=$(count_backups)
echo "Số bản sao lưu trước khi thử: $before" | tee -a "$out"

run_case loi-het-cho "
for v in spec['volumes']:
    if v['name'] == 'backup':
        v.clear(); v.update({'name': 'backup', 'emptyDir': {'medium': 'Memory', 'sizeLimit': '4Mi'}})"
run_case loi-khong-ghi-duoc "
for m in c['volumeMounts']:
    if m['name'] == 'backup':
        m['readOnly'] = True"
run_case loi-khong-toi-csdl "
for e in c['env']:
    if e['name'] == 'PGHOST':
        e['value'] = 'khong-ton-tai'"

after=$(count_backups)
echo "Số bản sao lưu sau khi thử: $after" | tee -a "$out"
[ "$before" = "$after" ] && echo "Bản sao lưu cũ không bị ảnh hưởng: ĐẠT" | tee -a "$out" || { echo "Bản sao lưu cũ bị đổi: SAI" | tee -a "$out"; fail=1; }
exit "$fail"
