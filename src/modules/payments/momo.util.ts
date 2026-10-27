import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Hàm thuần cho cổng MoMo (API v2 "AIO" — test-payment.momo.vn / payment.momo.vn), tách khỏi MomoService để test được.
 * Chữ ký = HMAC-SHA256(chuỗi "key=value&…" theo ĐÚNG thứ tự trường MoMo quy định, secretKey) dạng hex.
 * Thứ tự lấy từ code mẫu chính thức github.com/momo-wallet/payment (nodejs/MoMo.js, php/PayMoMo/ipn_momo.php).
 */

export const MOMO_SANDBOX_URL = 'https://test-payment.momo.vn';

/** `payWithMethod`: trang MoMo cho người dùng tự chọn ví MoMo / thẻ ATM nội địa / thẻ quốc tế. */
export const MOMO_REQUEST_TYPE = 'payWithMethod';

export function hmac(raw: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(raw).digest('hex');
}

export interface MomoCreateFields {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}

/** Chữ ký request tạo giao dịch (POST /v2/gateway/api/create). */
export function createSignature(
  f: MomoCreateFields,
  secretKey: string,
): string {
  return hmac(
    `accessKey=${f.accessKey}&amount=${f.amount}&extraData=${f.extraData}&ipnUrl=${f.ipnUrl}` +
      `&orderId=${f.orderId}&orderInfo=${f.orderInfo}&partnerCode=${f.partnerCode}` +
      `&redirectUrl=${f.redirectUrl}&requestId=${f.requestId}&requestType=${f.requestType}`,
    secretKey,
  );
}

/** Body MoMo gửi tới ipnUrl khi giao dịch có kết quả (Instant Payment Notification). */
export interface MomoIpn {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number | string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number | string;
  extraData: string;
  signature: string;
}

/** Chữ ký IPN — có `transId` ở CUỐI (code mẫu tham khảo của bên thứ ba bỏ sót trường này nên không bao giờ khớp). */
export function ipnSignature(
  b: MomoIpn,
  accessKey: string,
  secretKey: string,
): string {
  return hmac(
    `accessKey=${accessKey}&amount=${b.amount}&extraData=${b.extraData ?? ''}&message=${b.message}` +
      `&orderId=${b.orderId}&orderInfo=${b.orderInfo}&orderType=${b.orderType}&partnerCode=${b.partnerCode}` +
      `&payType=${b.payType}&requestId=${b.requestId}&responseTime=${b.responseTime}` +
      `&resultCode=${b.resultCode}&transId=${b.transId}`,
    secretKey,
  );
}

/** So chữ ký bằng timingSafeEqual (không lộ thời gian so từng ký tự). */
export function verifyIpn(
  b: MomoIpn,
  accessKey: string,
  secretKey: string,
): boolean {
  if (typeof b?.signature !== 'string') return false;
  const expected = Buffer.from(ipnSignature(b, accessKey, secretKey));
  const given = Buffer.from(b.signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Chữ ký request tra trạng thái giao dịch (POST /v2/gateway/api/query) — server tự hỏi MoMo, không tin client. */
export function querySignature(
  f: {
    accessKey: string;
    orderId: string;
    partnerCode: string;
    requestId: string;
  },
  secretKey: string,
): string {
  return hmac(
    `accessKey=${f.accessKey}&orderId=${f.orderId}&partnerCode=${f.partnerCode}&requestId=${f.requestId}`,
    secretKey,
  );
}

/** resultCode MoMo trả về (IPN + tra trạng thái) → đơn nên ra sao. Bảng mã: developers.momo.vn, mục "Mã lỗi".
 * Mã KHÔNG có trong 2 danh sách (lỗi hệ thống, không tìm thấy giao dịch…) = 'unknown': để nguyên đơn, lượt đối soát sau
 * hỏi lại — không huỷ vội đơn có thể vẫn đang được trả. */
export const MOMO_PENDING_CODES = [1000, 7000, 7002, 8000, 9000]; // khởi tạo, chờ người dùng xác nhận, đang xử lý
export const MOMO_FAILED_CODES = [
  1001, // không đủ tiền
  1002, // ngân hàng/nguồn tiền từ chối
  1003, // giao dịch bị huỷ
  1004, // vượt hạn mức thanh toán
  1005, // link / mã QR đã hết hạn
  1006, // người dùng từ chối / bấm huỷ
  1007, // tài khoản không hoạt động
  1017, // đối tác huỷ
  1026, // bị chặn bởi thể lệ khuyến mãi
  4001, // tài khoản bị hạn chế
  4100, // người dùng đăng nhập thất bại
];

export function momoOutcome(
  resultCode: number | null | undefined,
): 'paid' | 'pending' | 'failed' | 'unknown' {
  const code = Number(resultCode);
  if (code === 0) return 'paid';
  if (MOMO_PENDING_CODES.includes(code)) return 'pending';
  if (MOMO_FAILED_CODES.includes(code)) return 'failed';
  return 'unknown';
}

/** orderId gửi MoMo: "HN<mã đơn>T<thời điểm>" — MoMo bắt orderId KHÔNG trùng trong cả partnerCode (sandbox dùng chung
 * partnerCode "MOMO" với mọi người nên chỉ số mã đơn sẽ đụng), vẫn đọc ngược ra mã đơn của Hanni được. */
export function momoOrderId(orderCode: number, now: number): string {
  return `HN${orderCode}T${now}`;
}

export function orderCodeFromMomoOrderId(id: string): number | null {
  const m = /^HN(\d+)T\d+$/.exec(id ?? '');
  return m ? Number(m[1]) : null;
}
