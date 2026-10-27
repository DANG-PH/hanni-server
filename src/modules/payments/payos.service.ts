import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import type { Webhook } from '@payos/node/lib/resources/webhooks/webhook';
import type { Env } from '../../config/env.validation';

/**
 * Gọi cổng payOS (SDK `@payos/node`) — chỉ 3 việc, mọi nghiệp vụ đơn hàng nằm ở PaymentsService:
 *   createPaymentLink() → trang thanh toán + mã VietQR · getPaymentStatus() → hỏi trạng thái 1 đơn · verifyWebhook() → xác
 *   thực chữ ký webhook bằng checksum key.
 * payOS = chuyển khoản/quét VietQR (app ngân hàng nào cũng quét được, cả app MoMo), tiền về thẳng tài khoản ngân hàng đã liên
 * kết ở my.payos.vn; miễn phí, cá nhân đăng ký bằng CCCD; KHÔNG có môi trường test (thử bằng giao dịch thật số tiền nhỏ).
 * Khoá: PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY — để trống thì gọi vào là báo "Chưa cấu hình", app vẫn chạy.
 */
@Injectable()
export class PayosService {
  private client: PayOS | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    return !!(
      this.config.get('PAYOS_CLIENT_ID', { infer: true }) &&
      this.config.get('PAYOS_API_KEY', { infer: true }) &&
      this.config.get('PAYOS_CHECKSUM_KEY', { infer: true })
    );
  }

  private getClient(): PayOS {
    if (this.client) return this.client;
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình thanh toán — thiếu PAYOS_CLIENT_ID/PAYOS_API_KEY/PAYOS_CHECKSUM_KEY',
      );
    }
    this.client = new PayOS({
      clientId: this.config.get('PAYOS_CLIENT_ID', { infer: true }),
      apiKey: this.config.get('PAYOS_API_KEY', { infer: true }),
      checksumKey: this.config.get('PAYOS_CHECKSUM_KEY', { infer: true }),
    });
    return this.client;
  }

  /** Tạo link thanh toán. `description` là nội dung chuyển khoản — tối đa 9 ký tự với tài khoản ngân hàng không liên kết
   * qua payOS (tài liệu API "Tạo link thanh toán"). Trả lỗi của SDK nguyên vẹn để PaymentsService log + huỷ đơn. */
  async createPaymentLink(p: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; qrCode: string; paymentLinkId: string }> {
    const link = await this.getClient().paymentRequests.create(p);
    return {
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
      paymentLinkId: link.paymentLinkId,
    };
  }

  /** Trạng thái THẬT của 1 đơn trên payOS: PENDING / PROCESSING / PAID / UNDERPAID / CANCELLED / EXPIRED / FAILED. */
  async getPaymentStatus(
    orderCode: number,
  ): Promise<{ status: string; amountPaid: number }> {
    const link = await this.getClient().paymentRequests.get(orderCode);
    return { status: link.status, amountPaid: link.amountPaid };
  }

  /** Xác thực webhook (HMAC-SHA256 bằng checksum key) → dữ liệu giao dịch. Chữ ký sai thì SDK ném lỗi. */
  async verifyWebhook(payload: Webhook) {
    return this.getClient().webhooks.verify(payload);
  }
}
