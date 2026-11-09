#!/usr/bin/env python3
"""Đọc kết quả đo thăm dò của chay-kt2.sh, tìm mức cao nhất còn đạt SLO đọc, rồi đề xuất 3 mức KT2:
khoảng 25%, 60% và 90% của mức đó. In ra 3 số cách nhau bằng dấu cách và ghi lý do vào tệp chon-muc.txt.
  scripts/chon-muc.py k6/ket-qua/tham-do
"""
import glob
import json
import os
import re
import sys

folder = sys.argv[1]
rows = []
for path in glob.glob(os.path.join(folder, "muc-*-lan-1.json")):
    rate = int(re.search(r"muc-(\d+)-lan", path).group(1))
    m = json.load(open(path))["metrics"]
    read = m.get("http_req_duration{kind:read}", {})
    failed = m.get("http_req_failed", {}).get("value", 0)
    dropped = m.get("dropped_iterations", {}).get("count", 0)
    rps = m.get("http_reqs", {}).get("rate", 0)
    ok = read.get("p(95)", 1e9) < 300 and failed < 0.005 and dropped == 0
    rows.append((rate, rps, read.get("p(95)"), failed, dropped, ok))
rows.sort()

passing = [r for r in rows if r[5]]
knee = passing[-1][0] if passing else rows[0][0]
levels = sorted({max(1, round(knee * f)) for f in (0.25, 0.6, 0.9)})
with open(os.path.join(folder, "chon-muc.txt"), "w", encoding="utf-8") as f:
    f.write("RATE lượt/giây | req/s | p95 đọc ms | lỗi | dropped | đạt SLO\n")
    for r in rows:
        f.write(f"{r[0]} | {r[1]:.1f} | {r[2] if r[2] is None else round(r[2], 1)} | {r[3]:.4f} | {r[4]} | {'có' if r[5] else 'không'}\n")
    f.write(f"Mức cao nhất còn đạt SLO: RATE {knee}. Chọn 3 mức 25%, 60%, 90%: {' '.join(map(str, levels))}\n")
print(" ".join(map(str, levels)))
