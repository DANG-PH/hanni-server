// KB2 cả lớp xem video. VIEWERS người xem, mỗi người tải 1 đoạn HLS 6 giây, nên số đoạn/giây = VIEWERS / 6.
// Đo Nginx media, không đo API: kiểm chứng video không đi qua tiến trình Node.
//   docker run ... grafana/k6 run -e VIEWERS=60 /k6/kb2-video.js
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { BASE, post, session, ok } from './lib.js';

const VIEWERS = Number(__ENV.VIEWERS || 60);
const RESOURCE = __ENV.RESOURCE_ID || 'video-mau';
const LADDER = __ENV.LADDER || '540p';
const received = new Counter('segment_bytes');

export const options = {
  discardResponseBodies: true,
  scenarios: {
    xem_video: {
      executor: 'constant-arrival-rate',
      rate: Math.max(1, Math.round(VIEWERS / 6)),
      timeUnit: '1s',
      duration: __ENV.DURATION || '3m',
      preAllocatedVUs: 20,
      maxVUs: 400,
    },
  },
  thresholds: {
    'http_req_duration{kind:segment}': ['p(95)<2000'],
    http_req_failed: ['rate<0.005'],
  },
};

export function setup() {
  const res = post(`/resources/${RESOURCE}/link`, {}, { ...session(), responseType: 'text' }, '/resources/:id/link');
  ok(res, 'cấp liên kết', 201);
  return { url: res.json('url') };
}

export default function (data) {
  const dir = data.url.slice(0, data.url.lastIndexOf('/'));
  const n = String(Math.floor(Math.random() * 10)).padStart(3, '0');
  const res = http.get(`${dir}/${LADDER}/seg-${n}.ts`, {
    tags: { kind: 'segment', name: 'segment' },
    responseType: 'binary',
  });
  check(res, { 'đoạn video 200': (r) => r.status === 200 });
  received.add(res.body ? res.body.byteLength : 0);
}
