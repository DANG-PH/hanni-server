// KB1 theo mô hình ĐÓNG: VUS người dùng ảo, mỗi người làm xong 1 lượt mới làm lượt tiếp. Cùng các bước với kb1-tu-hoc.js
// để so sánh với mô hình mở trên cùng lab: server chậm thì mô hình đóng tự gửi chậm lại, nên số đo trông đẹp hơn thực tế.
//   scripts/k6.sh kb1-dong.js -e VUS=10 -e DURATION=3m
import { sleep } from 'k6';
import { get, ok, session, SLO_THRESHOLDS } from './lib.js';

export const options = {
  scenarios: {
    tu_hoc_dong: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
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
