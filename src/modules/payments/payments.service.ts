import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentOrderStatus } from '@prisma/client';
import { PayOS } from '@payos/node';
import type { Webhook } from '@payos/node/lib/resources/webhooks/webhook';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

/** Tỷ giá nạp xu — 1 VNĐ = 1 xu, đúng như đề xuất ban đầu (xem FEATURES.md
 * mục đánh giá rủi ro tài chính: an toàn hơn vì payOS dùng mô hình A2A,
 * tiền về THẲNG tài khoản ngân hàng của Hanni chứ không qua ví trung gian
 * giữ hộ — khác lo ngại ban đầu về hoạt động "trung gian thanh toán"). */
const VND_PER_XU = 1;

/**
 * Nạp tiền thật lấy xu qua payOS — Giai đoạn 5 minigame (FEATURES.md).
 * payOS dùng mô hình A2A (Account-to-Account): tạo payment link, người
 * dùng chuyển khoản/quét VietQR, tiền về thẳng tài khoản ngân hàng đã đăng
 * ký ở my.payos.vn — Hanni KHÔNG giữ tiền hộ ai, khác các cổng trung gian
 * truyền thống. Có gói miễn phí không giới hạn giao dịch cho cá nhân/hộ
 * kinh doanh (từ 01/2026), eKYC ngân hàng Kiên Long ~5 phút là dùng được,
 * không cần đăng ký doanh nghiệp đầy đủ.
 *
 * Để trống `PAYOS_CLIENT_ID`/`PAYOS_API_KEY`/`PAYOS_CHECKSUM_KEY` thì mọi
 * method ở đây ném `ServiceUnavailableException` rõ ràng — KHÔNG chặn app
 * khởi động, giống hệt cách `GEMINI_API_KEY`/VAPID đang làm.
 *
 * Xu vẫn là soft currency THUẦN: không hoàn tiền, không chuyển nhượng giữa
 * người dùng, không quy đổi ngược lại tiền mặt — chỉ tiêu được trong các
 * tính năng của chính Hanni. Đây là điểm mấu chốt giữ hoạt động này ở diện
 * "bán hàng hoá/dịch vụ số của chính mình" thay vì "trung gian thanh toán"
 * (không phát hành công cụ lưu trữ giá trị có thể rút ra/chuyển đi).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private client: PayOS | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private getClient(): PayOS {
    if (this.client) return this.client;
    const clientId = this.config.get('PAYOS_CLIENT_ID', { infer: true });
    const apiKey = this.config.get('PAYOS_API_KEY', { infer: true });
    const checksumKey = this.config.get('PAYOS_CHECKSUM_KEY', {
      infer: true,
    });
    if (!clientId || !apiKey || !checksumKey) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình nạp tiền — thiếu PAYOS_CLIENT_ID/PAYOS_API_KEY/PAYOS_CHECKSUM_KEY',
      );
    }
    this.client = new PayOS({ clientId, apiKey, checksumKey });
    return this.client;
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('PAYOS_CLIENT_ID', { infer: true }) &&
      this.config.get('PAYOS_API_KEY', { infer: true }) &&
      this.config.get('PAYOS_CHECKSUM_KEY', { infer: true })
    );
  }

  async createTopUp(
    userId: string,
    amountVnd: number,
  ): Promise<{ checkoutUrl: string; qrCode: string; orderCode: number }> {
    const client = this.getClient();
    const xuAmount = amountVnd * VND_PER_XU;

    const order = await this.prisma.paymentOrder.create({
      data: { userId, amountVnd, xuAmount },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    try {
      const link = await client.paymentRequests.create({
        orderCode: order.orderCode,
        amount: amountVnd,
        description: `Nap xu Hanni #${order.orderCode}`,
        returnUrl: `${frontendUrl}/account?topup=${order.orderCode}`,
        cancelUrl: `${frontendUrl}/account?topup=${order.orderCode}&cancelled=1`,
      });

      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { payosPaymentLinkId: link.paymentLinkId },
      });

      return {
        checkoutUrl: link.checkoutUrl,
        qrCode: link.qrCode,
        orderCode: order.orderCode,
      };
    } catch (err) {
      // Tạo link thất bại — không để lại đơn PENDING mồ côi không bao giờ
      // được xử lý (người dùng không có cách nào thanh toán cho đơn này).
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentOrderStatus.CANCELLED },
      });
      this.logger.error(`Tạo payment link payOS thất bại: ${err}`);
      throw new BadRequestException(
        'Chưa tạo được link thanh toán, thử lại nhé',
      );
    }
  }

  /** Đọc trạng thái đơn nạp — dùng cho trang /account sau khi payOS
   * redirect về qua `returnUrl`. Đọc thẳng DB (đã được webhook cập nhật)
   * thay vì gọi lại API payOS — nhanh hơn, và tránh phụ thuộc thêm 1 lượt
   * gọi mạng ra ngoài chỉ để hiện trạng thái cho FE. */
  async getOrderStatus(userId: string, orderCode: number) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderCode },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn nạp');
    }
    return {
      orderCode: order.orderCode,
      amountVnd: order.amountVnd,
      xuAmount: order.xuAmount,
      status: order.status,
    };
  }

  async getHistory(userId: string) {
    const orders = await this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return orders.map((o) => ({
      orderCode: o.orderCode,
      amountVnd: o.amountVnd,
      xuAmount: o.xuAmount,
      status: o.status,
      createdAt: o.createdAt,
    }));
  }

  /** payOS gọi thẳng endpoint này (không qua JWT) khi trạng thái thanh
   * toán đổi — xác thực bằng `webhooks.verify()` của SDK (HMAC-SHA256 với
   * checksum key), KHÔNG tin dữ liệu gửi lên nếu chưa xác thực được. Idempotent
   * theo `status !== PENDING` — payOS có thể gọi lại webhook nhiều lần cho
   * cùng 1 giao dịch. */
  async handleWebhook(payload: Webhook): Promise<void> {
    const client = this.getClient();
    let verified: Awaited<ReturnType<typeof client.webhooks.verify>>;
    try {
      verified = await client.webhooks.verify(payload);
    } catch (err) {
      this.logger.warn(`Webhook payOS không xác thực được: ${err}`);
      return;
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderCode: verified.orderCode },
    });
    if (!order) {
      this.logger.warn(
        `Webhook payOS cho đơn không tồn tại: orderCode=${verified.orderCode}`,
      );
      return;
    }
    if (order.status !== PaymentOrderStatus.PENDING) return; // đã xử lý rồi

    // So khớp số tiền — phòng payload bị chỉnh sửa dù đã qua verify() (vd
    // lỗi tích hợp phía payOS), không tin thẳng verified.amount để cộng xu.
    if (verified.amount !== order.amountVnd) {
      this.logger.error(
        `Webhook payOS lệch số tiền: order=${order.amountVnd} nhận=${verified.amount}`,
      );
      return;
    }

    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: PaymentOrderStatus.PAID, paidAt: new Date() },
    });
    await this.wallet.credit(order.userId, order.xuAmount, 'topup');
  }
}
