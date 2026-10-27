import {
  createSignature,
  ipnSignature,
  type MomoIpn,
  momoOrderId,
  momoOutcome,
  orderCodeFromMomoOrderId,
  verifyIpn,
} from './momo.util';

// Khoá SANDBOX công khai của MoMo (code mẫu github.com/momo-wallet/payment) — không phải bí mật.
const ACCESS = 'F8BBA842ECF85';
const SECRET = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

// Chữ ký mẫu tính bằng `openssl dgst -sha256 -hmac` (độc lập với code) trên đúng chuỗi theo thứ tự MoMo quy định.
const IPN: MomoIpn = {
  partnerCode: 'MOMO',
  orderId: 'HN7T1793000000000',
  requestId: 'HN7T1793000000000',
  amount: 19000,
  orderInfo: 'Hanni Premium tháng',
  orderType: 'momo_wallet',
  transId: 4088878653,
  resultCode: 0,
  message: 'Thành công.',
  payType: 'napas',
  responseTime: 1793000012345,
  extraData: '',
  signature: '1d46957a928bedc374f391a31979917e81d2a4a78220b23a93a729b0de9fb947',
};

describe('momo.util', () => {
  it('chữ ký tạo giao dịch khớp chuỗi chuẩn của MoMo', () => {
    expect(
      createSignature(
        {
          accessKey: ACCESS,
          amount: 19000,
          extraData: '',
          ipnUrl: 'https://hanni-api.dangpham.id.vn/api/payments/webhook/momo',
          orderId: 'HN7T1793000000000',
          orderInfo: 'Hanni Premium tháng',
          partnerCode: 'MOMO',
          redirectUrl: 'https://hanni.dangpham.id.vn/account?premium=7',
          requestId: 'HN7T1793000000000',
          requestType: 'payWithMethod',
        },
        SECRET,
      ),
    ).toBe('2adcf25c20df7f9c0f9457b3529c29b97a7decb0933894ca48f2d055b0bc8bbf');
  });

  it('chữ ký IPN khớp (có transId ở cuối)', () => {
    expect(ipnSignature(IPN, ACCESS, SECRET)).toBe(IPN.signature);
    expect(verifyIpn(IPN, ACCESS, SECRET)).toBe(true);
  });

  it('sửa số tiền / kết quả / mã giao dịch hoặc sai khoá thì chữ ký không còn khớp', () => {
    expect(verifyIpn({ ...IPN, amount: 1000 }, ACCESS, SECRET)).toBe(false);
    expect(verifyIpn({ ...IPN, resultCode: 1006 }, ACCESS, SECRET)).toBe(false);
    expect(verifyIpn({ ...IPN, transId: 1 }, ACCESS, SECRET)).toBe(false);
    expect(verifyIpn(IPN, ACCESS, 'khoa-sai')).toBe(false);
    expect(
      verifyIpn(
        { ...IPN, signature: undefined as unknown as string },
        ACCESS,
        SECRET,
      ),
    ).toBe(false);
  });

  it('mã kết quả MoMo → đã trả / đang chờ / thất bại / chưa rõ', () => {
    expect(momoOutcome(0)).toBe('paid');
    expect(momoOutcome(1000)).toBe('pending');
    expect(momoOutcome(7000)).toBe('pending');
    expect(momoOutcome(1006)).toBe('failed');
    expect(momoOutcome(1005)).toBe('failed');
    expect(momoOutcome(99)).toBe('unknown');
    expect(momoOutcome(undefined)).toBe('unknown');
  });

  it('orderId gửi MoMo đọc ngược ra đúng mã đơn', () => {
    const id = momoOrderId(57, 1793000000000);
    expect(id).toBe('HN57T1793000000000');
    expect(orderCodeFromMomoOrderId(id)).toBe(57);
    expect(orderCodeFromMomoOrderId('HN57')).toBeNull();
    expect(orderCodeFromMomoOrderId('MOMO123')).toBeNull();
  });
});
