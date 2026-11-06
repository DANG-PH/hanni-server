// Nộp bài đều đặn trong lúc diễn tập mất leader. In mã mỗi lượt server đã xác nhận để sau đó đối chiếu với leader mới:
// lượt đã báo thành công mà không còn trong CSDL mới là dữ liệu mất thật (DDIA ch. 5, sao chép bất đồng bộ).
//   scripts/k6.sh ghi-lien-tuc.js -e RATE=30 -e DURATION=150s > ket-qua/ghi.log 2>&1
import { get, post, session } from './lib.js';

const RATE = Number(__ENV.RATE || 30);

export const options = {
  scenarios: {
    ghi: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '150s',
      preAllocatedVUs: RATE * 3,
      maxVUs: RATE * 10,
    },
  },
};

export function setup() {
  const exams = get('/mock-exams').json();
  const list = Array.isArray(exams) ? exams : exams.items || exams.exams;
  const slug = list.find((e) => e.level === 1).slug;
  const paper = get(`/mock-exams/${slug}`).json();
  return { slug, total: paper.totalQuestions || 40, run: Date.now() };
}

export default function (data) {
  const answers = Array.from({ length: data.total }, () => Math.floor(Math.random() * 3));
  const s = session();
  const res = post(
    `/mock-exams/${data.slug}/submit`,
    { answers, durationSec: 2000 },
    {
      ...s,
      headers: { ...s.headers, 'Idempotency-Key': `${data.run}-${__VU}-${__ITER}` },
      tags: { kind: 'write' },
    },
    '/mock-exams/:slug/submit',
  );
  if (res.status === 201) console.log(`DA_GHI ${res.json('attemptId')}`);
}
