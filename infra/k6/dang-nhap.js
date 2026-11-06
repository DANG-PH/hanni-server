// Đo đăng nhập đồng loạt để kiểm chứng giả thuyết scrypt tốn CPU. RATE là số lượt đăng nhập mỗi giây.
// Mỗi lượt là 1 tài khoản khác nhau nên không chạm giới hạn 10 lượt/phút của từng cặp IP + email.
//   PASS=$(scripts/kubectl -n hanni get secret hanni-secrets -o jsonpath='{.data.LOADTEST_PASSWORD}' | base64 -d)
//   scripts/k6.sh dang-nhap.js -e PASS=$PASS -e RATE=5 -e DURATION=2m
import { post, ok } from './lib.js';

const RATE = Number(__ENV.RATE || 5);

export const options = {
  scenarios: {
    dang_nhap: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: RATE * 5,
      maxVUs: RATE * 40,
    },
  },
  thresholds: {
    'http_req_duration{kind:login}': ['p(95)<1000'],
    http_req_failed: ['rate<0.005'],
  },
};

export default function () {
  const n = String(1 + ((__VU * 7 + __ITER) % 1000)).padStart(4, '0');
  const res = post(
    '/auth/login',
    { email: `loadtest-${n}@example.test`, password: __ENV.PASS },
    { tags: { kind: 'login' } },
  );
  ok(res, 'đăng nhập');
}
