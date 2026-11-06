#!/usr/bin/env bash
# Sinh mật khẩu ngẫu nhiên cho lab rồi nạp vào cụm. Không ghi ra tệp nào nên không có gì để lỡ commit.
# Chạy lại không đổi mật khẩu đã có, tránh Postgres và app lệch nhau.
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd):$PATH"

rand() { docker run --rm alpine:3.21 sh -c "tr -dc a-f0-9 < /dev/urandom | head -c 48"; }

kubectl get namespace hanni >/dev/null 2>&1 || kubectl create namespace hanni
kubectl get namespace observability >/dev/null 2>&1 || kubectl create namespace observability

if ! kubectl -n hanni get secret hanni-secrets >/dev/null 2>&1; then
  pg=$(rand)
  kubectl -n hanni create secret generic hanni-secrets \
    --from-literal=POSTGRES_PASSWORD="$pg" \
    --from-literal=DATABASE_URL="postgresql://hanni:$pg@hanni-pgbouncer:5432/hanni" \
    --from-literal=DATABASE_URL_DIRECT="postgresql://hanni:$pg@hanni-postgres:5432/hanni" \
    --from-literal=REDIS_URL="redis://hanni-redis:6379" \
    --from-literal=JWT_ACCESS_SECRET="$(rand)" \
    --from-literal=JWT_REFRESH_SECRET="$(rand)" \
    --from-literal=RESOURCE_LINK_SECRET="$(rand)" \
    --from-literal=LOADTEST_PASSWORD="$(rand)"
fi

if ! kubectl -n observability get secret grafana-admin >/dev/null 2>&1; then
  kubectl -n observability create secret generic grafana-admin --from-literal=password="$(rand)"
fi
