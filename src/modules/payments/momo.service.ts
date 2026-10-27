import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import {
  createSignature,
  MOMO_REQUEST_TYPE,
  MOMO_SANDBOX_URL,
  type MomoIpn,
  querySignature,
  verifyIpn,
} from './momo.util';

/**
 * Gọi API cổng MoMo (v2 "AIO"). MoMo và payOS là 2 cổng KHÁC nhau hoàn toàn: payOS = chuyển khoản/VietQR (tiền về tài
 * khoản ngân hàng), MoMo = trang thanh toán của MoMo (ví MoMo, thẻ ATM nội địa, thẻ quốc tế; tiền về ví doanh nghiệp
 * MoMo). Chung 1 bảng PaymentOrder (cột `provider`) và chung bước cộng Premium (PaymentsService.grantPaidOrder).
 *
 * Khoá: MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY, endpoint MOMO_API_URL (mặc định sandbox). Khoá SANDBOX
 * là khoá công khai (code mẫu của MoMo) và tiền sandbox là tiền ảo → trên production, khoá thử bị ẩn khỏi popup và đơn
 * sandbox KHÔNG cộng Premium (`grantsPremium()`); chạy local thì cộng để thử trọn luồng. Khoá thật: đăng ký
 * business.momo.vn (cần giấy phép kinh doanh — hộ kinh doanh hoặc doanh nghiệp, hợp đồng).
 */
@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get keys() {
    return {
      partnerCode: this.config.get('MOMO_PARTNER_CODE', { infer: true }),
      accessKey: this.config.get('MOMO_ACCESS_KEY', { infer: true }),
      secretKey: this.config.get('MOMO_SECRET_KEY', { infer: true }),
      apiUrl: this.config
        .get('MOMO_API_URL', { infer: true })
        .replace(/\/+$/, ''),
    };
  }

  isConfigured(): boolean {
    const k = this.keys;
    return !!(k.partnerCode && k.accessKey && k.secretKey);
  }

  /** Đang trỏ sandbox của MoMo (tiền ảo). */
  isSandbox(): boolean {
    return this.keys.apiUrl === MOMO_SANDBOX_URL;
  }

  /** Có được cộng Premium thật không: khoá thật thì có; sandbox chỉ khi KHÔNG chạy production (máy dev, demo local). */
  grantsPremium(): boolean {
    return (
      !this.isSandbox() ||
      this.config.get('NODE_ENV', { infer: true }) !== 'production'
    );
  }

  /** Tạo giao dịch → trả `payUrl` (trang thanh toán của MoMo) để client chuyển hướng sang. */
  async createPayment(p: {
    orderId: string;
    amount: number;
    orderInfo: string;
    redirectUrl: string;
    ipnUrl: string;
  }): Promise<{ payUrl: string }> {
    if (!this.isConfigured())
      throw new ServiceUnavailableException(
        'Chưa mở thanh toán qua MoMo', // thiếu MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY
      );
    const k = this.keys;
    const fields = {
      accessKey: k.accessKey,
      amount: p.amount,
      extraData: '',
      ipnUrl: p.ipnUrl,
      orderId: p.orderId,
      orderInfo: p.orderInfo,
      partnerCode: k.partnerCode,
      redirectUrl: p.redirectUrl,
      requestId: p.orderId,
      requestType: MOMO_REQUEST_TYPE,
    };
    const res = await fetch(`${k.apiUrl}/v2/gateway/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fields,
        signature: createSignature(fields, k.secretKey),
        lang: 'vi',
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      resultCode?: number;
      message?: string;
      payUrl?: string;
    };
    if (data.resultCode !== 0 || !data.payUrl) {
      this.logger.error(
        `MoMo tạo giao dịch lỗi: HTTP ${res.status} resultCode=${data.resultCode} ${data.message ?? ''}`,
      );
      throw new BadRequestException(
        'Chưa tạo được giao dịch MoMo, thử lại nhé',
      );
    }
    return { payUrl: data.payUrl };
  }

  /** IPN có đúng do MoMo ký không (HMAC bằng secretKey). */
  verifyIpn(body: MomoIpn): boolean {
    const k = this.keys;
    return (
      this.isConfigured() &&
      body?.partnerCode === k.partnerCode &&
      verifyIpn(body, k.accessKey, k.secretKey)
    );
  }

  /** Tự hỏi MoMo trạng thái 1 giao dịch (server → MoMo, có chữ ký) — dùng khi người dùng quay về trước khi IPN tới,
   * hoặc khi chạy local (MoMo không gọi được IPN vào localhost). resultCode 0 = đã thanh toán. */
  async queryStatus(
    orderId: string,
  ): Promise<{ resultCode: number; amount: number; transId: string } | null> {
    if (!this.isConfigured()) return null;
    const k = this.keys;
    const fields = {
      accessKey: k.accessKey,
      orderId,
      partnerCode: k.partnerCode,
      requestId: `${orderId}Q${Date.now()}`,
    };
    try {
      const res = await fetch(`${k.apiUrl}/v2/gateway/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCode: fields.partnerCode,
          requestId: fields.requestId,
          orderId,
          signature: querySignature(fields, k.secretKey),
          lang: 'vi',
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const d = (await res.json()) as {
        resultCode: number;
        amount: number;
        transId: number | string;
      };
      return {
        resultCode: d.resultCode,
        amount: Number(d.amount),
        transId: String(d.transId ?? ''),
      };
    } catch (err) {
      this.logger.warn(`MoMo tra trạng thái lỗi: ${err}`);
      return null;
    }
  }
}
