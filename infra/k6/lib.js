// Dùng chung cho mọi kịch bản. Mô hình MỞ (arrival-rate): k6 gửi đúng nhịp đã định dù server chậm, nên server chậm là
// thấy ngay ở phân vị. Mô hình đóng chờ server trả lời rồi mới gửi tiếp nên số đẹp giả (coordinated omission).
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

export const BASE = __ENV.BASE_URL || 'http://api.hanni.localhost:18080';

// Chặn đo nhầm production: chỉ nhận tên miền .localhost hoặc IP nội bộ.
if (!/^https?:\/\/([a-z0-9.-]+\.localhost|localhost|127\.|10\.|192\.168\.)/.test(BASE)) {
  throw new Error(`BASE_URL không phải địa chỉ lab: ${BASE}`);
}

const tokens = new SharedArray('tokens', () => JSON.parse(open(__ENV.TOKENS_FILE || '/k6/tokens.json')));

/** Mỗi lượt lấy 1 tài khoản giả xoay vòng. Cookie thay vì Bearer: giới hạn request đọc cookie để đếm theo người. */
export function session() {
  // Trong setup() k6 chưa có __ITER.
  const iter = typeof __ITER === 'undefined' ? 0 : __ITER;
  const token = tokens[(__VU * 7 + iter) % tokens.length];
  return { headers: { Cookie: `hanni_access=${token}` } };
}

export function ok(res, name, status = 200) {
  return check(res, { [`${name} ${status}`]: (r) => r.status === status });
}

export function get(path, params, name) {
  return http.get(`${BASE}/api${path}`, { ...params, tags: { ...(params && params.tags), name: name || path } });
}

export function post(path, body, params, name) {
  return http.post(`${BASE}/api${path}`, JSON.stringify(body), {
    ...params,
    headers: { ...(params && params.headers), 'Content-Type': 'application/json' },
    tags: { ...(params && params.tags), name: name || path },
  });
}

/** Số trong SLO. Vượt thì k6 thoát mã khác 0 để script thu số liệu biết lần đo đó không đạt. */
export const SLO_THRESHOLDS = {
  'http_req_duration{kind:read}': ['p(95)<300'],
  'http_req_duration{kind:write}': ['p(95)<500'],
  http_req_failed: ['rate<0.005'],
};
