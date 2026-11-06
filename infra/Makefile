# Dựng lab k3s, chỉ cần Docker. Lần đầu: make up  →  make images  →  make deploy  →  make seed  →  make observability
# Tạm dừng cho nhẹ máy, giữ dữ liệu: make stop / make start. Xoá sạch: make down.
SHELL := /bin/bash
SERVER := $(abspath ..)
export PATH := $(abspath scripts):$(PATH)

.PHONY: up down stop start sample images deploy seed observability status

sample:
	test -f media/out/video-mau/master.m3u8 || ./media/make-sample.sh

up: sample
	docker compose up -d
	./scripts/cho-du-node.sh
	kubectl get nodes
	./scripts/secrets.sh

images:
	docker build --target api -t hanni-api:lab $(SERVER)
	docker build --target tools -t hanni-tools:lab $(SERVER)
	docker pull -q postgres:16-alpine
	docker save hanni-api:lab hanni-tools:lab postgres:16-alpine | docker compose exec -T server ctr images import -
	docker save hanni-api:lab hanni-tools:lab postgres:16-alpine | docker compose exec -T agent ctr images import -

deploy:
	kubectl apply -k /infra/k8s
	kubectl -n hanni rollout status statefulset/hanni-postgres --timeout=900s
	kubectl -n hanni rollout status statefulset/hanni-postgres-replica --timeout=600s
	kubectl -n hanni rollout status deployment/hanni-pgbouncer --timeout=120s

seed:
	kubectl apply -f /infra/k8s/app/jobs.yaml -l step=migrate
	kubectl -n hanni wait --for=condition=complete job/hanni-migrate --timeout=300s
	kubectl apply -f /infra/k8s/app/jobs.yaml -l step=seed
	kubectl -n hanni wait --for=condition=complete job/hanni-seed --timeout=900s
	kubectl apply -f /infra/k8s/app/jobs.yaml -l step=users
	kubectl -n hanni wait --for=condition=complete job/hanni-users --timeout=300s
	kubectl -n hanni logs job/hanni-users | sed -n 's/^TOKENS=//p' > k6/tokens.json
	kubectl -n hanni rollout restart deployment/hanni-api deployment/hanni-worker
	kubectl -n hanni rollout status deployment/hanni-api --timeout=300s

observability:
	kubectl apply -k /infra/observability

status:
	kubectl -n hanni get pods,hpa,pdb
	kubectl -n observability get pods
	kubectl top nodes

stop:
	docker compose stop

start:
	docker compose start

down:
	docker compose down -v
