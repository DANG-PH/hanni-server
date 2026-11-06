// KB3 thi thử đồng loạt: USERS người mở đề trong 60 giây, nghỉ, rồi nộp bài trong 30 giây. Đây là đợt ghi nặng nhất.
// Mặc định 600 người theo bảng tính: 10 req/s mở đề, 20 req/s nộp bài. GAP là quãng nghỉ thay cho thời gian làm bài.
//   docker run ... grafana/k6 run -e USERS=600 /k6/kb3-thi-thu.js
import { get, post, ok, session, SLO_THRESHOLDS } from './lib.js';

const USERS = Number(__ENV.USERS || 600);
const OPEN_RATE = Math.ceil(USERS / 60);
const SUBMIT_RATE = Math.ceil(USERS / 30);
const GAP_S = Number(__ENV.GAP || 30);

export const options = {
  scenarios: {
    mo_de: {
      executor: 'constant-arrival-rate',
      exec: 'openPaper',
      rate: OPEN_RATE,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: OPEN_RATE * 3,
      maxVUs: OPEN_RATE * 30,
    },
    nop_bai: {
      executor: 'constant-arrival-rate',
      exec: 'submit',
      startTime: `${60 + GAP_S}s`,
      rate: SUBMIT_RATE,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: SUBMIT_RATE * 3,
      maxVUs: SUBMIT_RATE * 30,
    },
  },
  thresholds: SLO_THRESHOLDS,
};

export function setup() {
  const exams = get('/mock-exams').json();
  const list = Array.isArray(exams) ? exams : exams.items || exams.exams;
  const slug = list.find((e) => e.level === 1).slug;
  const paper = get(`/mock-exams/${slug}`).json();
  return { slug, total: paper.totalQuestions || 40 };
}

export function openPaper(data) {
  ok(get(`/mock-exams/${data.slug}`, { ...session(), tags: { kind: 'read' } }, '/mock-exams/:slug'), 'mở đề');
}

export function submit(data) {
  const answers = Array.from({ length: data.total }, () => Math.floor(Math.random() * 3));
  const res = post(
    `/mock-exams/${data.slug}/submit`,
    { answers, durationSec: 2000 },
    { ...session(), tags: { kind: 'write' } },
    '/mock-exams/:slug/submit',
  );
  ok(res, 'nộp bài', 201);
}
