#!/usr/bin/env python3
"""Xuất chỉ số từ Prometheus của lab trong 1 khoảng thời gian, mỗi 15 giây 1 dòng, ra CSV.
Dùng để nối số k6 với CPU, RAM, hàng đợi CSDL, số bản API theo cùng trục thời gian.
  scripts/xuat-chi-so.py <bắt đầu epoch> <kết thúc epoch> <tệp.csv>
"""
import csv
import json
import os
import subprocess
import sys
import urllib.parse

KUBECTL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kubectl")
API = 'app="hanni-api"'
NOT_PROBE = 'route!~".*(health|metrics).*"'
QUERIES = {
    "req_s": f"sum(rate(http_server_duration_seconds_count{{{NOT_PROBE}}}[30s]))",
    "loi_503_s": 'sum(rate(http_server_duration_seconds_count{status="503"}[30s])) or vector(0)',
    "loi_5xx_khac_s": 'sum(rate(http_server_duration_seconds_count{status=~"5..",status!="503"}[30s])) or vector(0)',
    "p50_ms": f"histogram_quantile(0.5, sum by (le) (rate(http_server_duration_seconds_bucket{{{NOT_PROBE}}}[30s]))) * 1000",
    "p95_ms": f"histogram_quantile(0.95, sum by (le) (rate(http_server_duration_seconds_bucket{{{NOT_PROBE}}}[30s]))) * 1000",
    "p99_ms": f"histogram_quantile(0.99, sum by (le) (rate(http_server_duration_seconds_bucket{{{NOT_PROBE}}}[30s]))) * 1000",
    "cpu_api_loi": f"sum(rate(process_cpu_seconds_total{{{API}}}[30s]))",
    "ram_api_mb": f"sum(process_resident_memory_bytes{{{API}}}) / 1048576",
    "tre_event_loop_ms": f"max(nodejs_eventloop_lag_p99_seconds{{{API}}}) * 1000",
    "cho_ket_noi_csdl": 'sum(db_pool_connections{state="waiting"})',
    "so_ban_api_san_sang": 'count(kube_pod_status_ready{namespace="hanni",condition="true",pod=~"hanni-api.*"} == 1)',
    "cpu_postgres_loi": 'sum(rate(container_cpu_usage_seconds_total{namespace="hanni",pod="hanni-postgres-0",container="postgres"}[30s]))',
    "ram_postgres_mb": 'sum(container_memory_working_set_bytes{namespace="hanni",pod="hanni-postgres-0",container="postgres"}) / 1048576',
    "cpu_toan_cum_loi": 'sum(rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[30s]))',
    "tre_ban_sao_giay": 'max(pg_replication_lag_seconds) or vector(0)',
}


def query(expr, start, end):
    url = "http://localhost:9090/api/v1/query_range?" + urllib.parse.urlencode(
        {"query": expr, "start": start, "end": end, "step": 15})
    out = subprocess.run([KUBECTL, "-n", "observability", "exec", "deploy/prometheus", "--", "wget", "-qO-", url],
                         capture_output=True, text=True, timeout=60).stdout
    try:
        result = json.loads(out)["data"]["result"]
    except (ValueError, KeyError):
        return {}
    return {int(t): v for t, v in result[0]["values"]} if result else {}


def main():
    start, end, target = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    series = {name: query(expr, start, end) for name, expr in QUERIES.items()}
    times = sorted({t for s in series.values() for t in s})
    with open(target, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["thoi_diem_epoch", "giay_tu_dau"] + list(QUERIES))
        for t in times:
            row = []
            for name in QUERIES:
                v = series[name].get(t)
                row.append("" if v in (None, "NaN") else round(float(v), 3))
            w.writerow([t, t - start] + row)
    print(f"{target}: {len(times)} dòng")


if __name__ == "__main__":
    main()
