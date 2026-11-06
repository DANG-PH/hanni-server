// Đo thăm dò tìm điểm gãy: tăng dần tốc độ tới khi p95 hoặc tỉ lệ lỗi vượt SLO thì tự dừng.
// Lúc đang tăng, xem Grafana bảng "Hanni: Mở rộng" để thấy HPA thêm bản. Điểm gãy là số để chọn 3 mức tải chính thức.
//   docker run ... grafana/k6 run -e MAX_RATE=40 /k6/tang-dan.js
import { get, ok, session } from './lib.js';

const MAX = Number(__ENV.MAX_RATE || 40);
const STEP = __ENV.STEP || '90s';
const steps = [0.2, 0.4, 0.6, 0.8, 1].map((f) => ({ target: Math.ceil(MAX * f), duration: STEP }));
// Giữ ở đỉnh để xem quá điểm gãy hệ thống đứng vững hay sập: -e HOLD=90s
if (__ENV.HOLD) steps.push({ target: MAX, duration: __ENV.HOLD });

export const options = {
  scenarios: {
    tang_dan: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      stages: steps,
      preAllocatedVUs: 30,
      maxVUs: Number(__ENV.MAX_VUS || MAX * 15),
    },
  },
  thresholds: {
    'http_req_duration{kind:read}': [{ threshold: 'p(95)<1500', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
  },
};

export default function () {
  const read = { ...session(), tags: { kind: 'read' } };
  ok(get('/learn/path?level=1', read), 'lộ trình');
  ok(get('/words?q=hoc&pageSize=10', read, '/words?q='), 'tra từ');
}
