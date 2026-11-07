#!/usr/bin/env bash
# Chép bản sao lưu mới nhất ra ngoài cụm rồi đối chiếu mã băm. Bản trong cụm chung ổ với dữ liệu nên chưa phải bản an toàn.
#   scripts/chep-sao-luu.sh /duong/dan/ngoai-cum
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

dest=${1:?Cần thư mục đích}
ns=hanni
reader=doc-sao-luu
mkdir -p "$dest"
kubectl -n "$ns" delete pod "$reader" --ignore-not-found >/dev/null
kubectl -n "$ns" run "$reader" --image=postgres:16-alpine --restart=Never --labels=app=hanni-backup \
  --overrides='{"spec":{"containers":[{"name":"doc-sao-luu","image":"postgres:16-alpine","command":["sleep","600"],
    "volumeMounts":[{"name":"backup","mountPath":"/backup"}]}],
    "volumes":[{"name":"backup","persistentVolumeClaim":{"claimName":"hanni-backup"}}]}}' >/dev/null
trap 'kubectl -n "$ns" delete pod "$reader" --ignore-not-found --wait=false >/dev/null' EXIT
kubectl -n "$ns" wait --for=condition=Ready "pod/$reader" --timeout=60s >/dev/null

sum=$(kubectl -n "$ns" exec "$reader" -- sh -c 'ls -1t /backup/hanni-*.sha256 | head -1')
stamp=${sum#/backup/hanni-}; stamp=${stamp%.sha256}
for name in "hanni-$stamp.dump" "hoc-lieu-$stamp.tar.gz" "hanni-$stamp.sha256"; do
  kubectl -n "$ns" exec "$reader" -- cat "/backup/$name" > "$dest/$name"
done
(cd "$dest" && sha256sum -c "hanni-$stamp.sha256")
ls -la "$dest" | tail -n +4
