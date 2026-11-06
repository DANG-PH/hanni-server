// KB1 tự học rải rác. RATE là số lượt mở bài/giây. Mặc định theo bảng tính tài nguyên: 19,7 req/s tổng.
//   docker run ... grafana/k6 run -e RATE=4 -e DURATION=5m /k6/kb1-tu-hoc.js
import { sleep } from 'k6';
import { get, post, ok, session, SLO_THRESHOLDS } from './lib.js';

const RATE = Number(__ENV.RATE || 4);

export const options = {
  discardResponseBodies: false,
  scenarios: {
    tu_hoc: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: RATE * 5,
      maxVUs: RATE * 40,
      gracefulStop: '30s',
    },
  },
  thresholds: SLO_THRESHOLDS,
};

export function setup() {
  const res = get('/learn/start?level=1');
  return { lessonId: res.json('lessonId') || res.json('id') };
}

export default function (data) {
  const s = session();
  const read = { ...s, tags: { kind: 'read' } };
  ok(get('/learn/path?level=1', read), 'lộ trình');
  ok(get('/streak', read), 'chuỗi ngày');
  ok(get(`/learn/lessons/${data.lessonId}/session`, read, '/learn/lessons/:id/session'), 'phiên học');
  ok(get('/words?q=hoc&pageSize=10', read, '/words?q='), 'tra từ');
  sleep(Math.random());
  ok(get('/words/of-the-day?level=1', read), 'từ hôm nay');
}
