import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PayOS } from '@payos/node';
import type { Webhook } from '@payos/node/lib/resources/webhooks/webhook';
import { Repository } from 'typeorm';
import type { Env } from '../../config/env.validation';
import { PaymentOrder, User } from '../../database/entities';
import { PaymentOrderStatus } from '../../database/enums';
import { insertAndReturn } from '../../database/repository.util';
import { extendPremiumUntil, PREMIUM_PLANS } from '../premium/premium-plans';

/**
 * Bán gói Premium qua payOS. payOS dùng mô hình A2A (Account-to-Account): tạo payment link, người dùng chuyển
 * khoản/quét VietQR (app ngân hàng nào cũng quét được, cả ví MoMo), tiền về thẳng tài khoản ngân hàng đã liên kết ở
 * my.payos.vn — Hanni KHÔNG giữ tiền hộ ai. payOS miễn phí, không phí trung gian (trang chủ payos.vn, đọc 2026-10-27),
 * cá nhân đăng ký bằng CCCD, không cần giấy phép kinh doanh. KHÔNG có môi trường test riêng — thử bằng giao dịch thật,
 * số tiền nhỏ (payos.vn/docs/moi-truong-test).
 *
 * Luồng 1 lần mua (đọc theo thứ tự):
 *   1. Popup Premium (client `components/premium-modal.tsx`) → POST /payments/premium-checkout → `createPremiumCheckout()`
 *      tạo `PaymentOrder` PENDING + gọi payOS tạo link → trình duyệt chuyển sang trang thanh toán của payOS.
 *   2. Người dùng chuyển khoản → payOS gọi POST /payments/webhook/payos (máy chủ payOS gọi máy chủ Hanni) →
 *      `handleWebhook()` xác thực chữ ký → đơn PAID → cộng hạn `User.premiumUntil`.
 *   3. payOS đưa trình duyệt về `/account?premium=<mã đơn>` → client (`components/premium-section.tsx`) hỏi
 *      GET /payments/orders/:orderCode → `getOrderStatus()` cho tới khi thấy PAID.
 *
 * Để trống `PAYOS_CLIENT_ID`/`PAYOS_API_KEY`/`PAYOS_CHECKSUM_KEY` thì mọi method ở đây ném
 * `ServiceUnavailableException` rõ ràng — KHÔNG chặn app khởi động, giống `GEMINI_API_KEY`/VAPID.
 *
 * Trước 2026-10-20 còn bán xu (nạp tiền lấy xu, 1 VNĐ = 1 xu) — đã bỏ cùng hệ thống xu; bảng `PaymentOrder` vẫn giữ
 * cột `kind`/`xuAmount` của các đơn cũ.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private client: PayOS | null = null;

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly orders: Repository<PaymentOrder>,
    @InjectRepository(User) private readonly users: Repository<User>,
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
        'Chưa cấu hình thanh toán — thiếu PAYOS_CLIENT_ID/PAYOS_API_KEY/PAYOS_CHECKSUM_KEY',
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

  /** Tạo đơn Premium + payment link payOS; người dùng thanh toán xong được đưa về `/account?premium=<mã đơn>`. */
  async createPremiumCheckout(
    userId: string,
    planKey: string,
  ): Promise<{ checkoutUrl: string; qrCode: string; orderCode: number }> {
    const plan = PREMIUM_PLANS.find((p) => p.key === planKey);
    if (!plan) throw new BadRequestException('Không tìm thấy gói Premium này');
    const client = this.getClient();

    const order = await insertAndReturn(this.orders, {
      userId,
      amountVnd: plan.priceVnd,
      xuAmount: 0,
      kind: 'PREMIUM',
      premiumPlanKey: planKey,
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    try {
      const link = await client.paymentRequests.create({
        orderCode: order.orderCode,
        amount: plan.priceVnd,
        // Nội dung chuyển khoản. payOS: tài khoản ngân hàng KHÔNG liên kết qua payOS chỉ nhận tối đa 9 ký tự (tài liệu
        // API "Tạo link thanh toán", trường description) — bản cũ "Hanni Premium #123" dài 18 ký tự thì payOS từ chối
        // tạo link với các tài khoản đó. "HN" + mã đơn vừa 9 ký tự tới đơn thứ 9.999.999, vẫn tra được đơn trong sao kê.
        description: `HN${order.orderCode}`,
        returnUrl: `${frontendUrl}/account?premium=${order.orderCode}`,
        cancelUrl: `${frontendUrl}/account?premium=${order.orderCode}&cancelled=1`,
      });

      await this.orders.update(order.id, {
        payosPaymentLinkId: link.paymentLinkId,
      });

      return {
        checkoutUrl: link.checkoutUrl,
        qrCode: link.qrCode,
        orderCode: order.orderCode,
      };
    } catch (err) {
      await this.orders.update(order.id, {
        status: PaymentOrderStatus.CANCELLED,
      });
      this.logger.error(`Tạo payment link payOS (Premium) thất bại: ${err}`);
      throw new BadRequestException(
        'Chưa tạo được link thanh toán, thử lại nhé',
      );
    }
  }

  /** Đọc trạng thái đơn — dùng cho trang /account sau khi payOS
   * redirect về qua `returnUrl`. Đọc thẳng DB (đã được webhook cập nhật)
   * thay vì gọi lại API payOS — nhanh hơn, và tránh phụ thuộc thêm 1 lượt
   * gọi mạng ra ngoài chỉ để hiện trạng thái cho FE. */
  async getOrderStatus(userId: string, orderCode: number) {
    const order = await this.orders.findOneBy({ orderCode });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn thanh toán');
    }
    return {
      orderCode: order.orderCode,
      amountVnd: order.amountVnd,
      premiumPlanKey: order.premiumPlanKey,
      status: order.status,
    };
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

    const order = await this.orders.findOneBy({
      orderCode: verified.orderCode,
    });
    if (!order) {
      this.logger.warn(
        `Webhook payOS cho đơn không tồn tại: orderCode=${verified.orderCode}`,
      );
      return;
    }
    if (order.status !== PaymentOrderStatus.PENDING) return; // đã xử lý rồi (đọc nhanh, tránh việc thừa — xem chặn thật ở dưới)

    // So khớp số tiền — phòng payload bị chỉnh sửa dù đã qua verify() (vd
    // lỗi tích hợp phía payOS), không tin thẳng verified.amount.
    if (verified.amount !== order.amountVnd) {
      this.logger.error(
        `Webhook payOS lệch số tiền: order=${order.amountVnd} nhận=${verified.amount}`,
      );
      return;
    }

    // Chuyển PENDING -> PAID bằng UPDATE có ĐIỀU KIỆN status = PENDING
    // (atomic ở tầng DB) thay vì đọc-rồi-ghi — payOS xác nhận có gọi lại
    // webhook nhiều lần cho cùng giao dịch, 2 lượt gọi trùng nhau chạy gần
    // như đồng thời đều có thể đọc thấy PENDING trước khi bên nào commit
    // xong PAID (lỗi thật, cộng xu/gia hạn Premium 2 lần cho 1 giao dịch).
    // UPDATE với where lọc theo status CHỈ 1 request thắng được điều
    // kiện này dù chạy song song, `affected === 0` nghĩa là request khác đã
    // xử lý xong (hoặc đang xử lý) — bỏ qua an toàn.
    const claimed = await this.orders.update(
      { id: order.id, status: PaymentOrderStatus.PENDING },
      { status: PaymentOrderStatus.PAID, paidAt: new Date() },
    );
    if (!claimed.affected) return;

    if (order.kind !== 'PREMIUM') {
      // Đơn nạp xu tạo trước khi bỏ hệ thống xu (2026-10-20) — không còn gì để cộng, cần hoàn tiền thủ công.
      this.logger.error(
        `Webhook payOS: đơn nạp xu cũ #${order.orderCode} vừa được thanh toán — cần hoàn tiền thủ công`,
      );
      return;
    }
    try {
      const user = await this.users.findOneOrFail({
        where: { id: order.userId },
        select: { id: true, premiumUntil: true },
      });
      const newUntil = extendPremiumUntil(
        user.premiumUntil,
        order.premiumPlanKey!,
      );
      await this.users.update(order.userId, { premiumUntil: newUntil });
    } catch (err) {
      // Đơn đã chắc chắn PAID (đã thanh toán thật) nhưng gia hạn Premium thất
      // bại — KHÔNG lùi lại PENDING (payOS gọi lại webhook sẽ bị chặn bởi guard
      // ở trên, không tự sửa được) — log ERROR rõ ràng để đối soát thủ công,
      // còn hơn nuốt lỗi im lặng khiến user mất tiền thật mà không ai biết.
      this.logger.error(
        `Webhook payOS: đơn #${order.orderCode} đã PAID nhưng gia hạn Premium thất bại — cần đối soát thủ công: ${err}`,
      );
    }
  }
}
