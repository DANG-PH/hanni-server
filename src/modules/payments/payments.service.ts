import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Webhook } from '@payos/node/lib/resources/webhooks/webhook';
import { In, MoreThan, Repository } from 'typeorm';
import type { Env } from '../../config/env.validation';
import { PaymentOrder, User } from '../../database/entities';
import { PaymentOrderStatus } from '../../database/enums';
import { insertAndReturn } from '../../database/repository.util';
import {
  extendPremiumUntil,
  PREMIUM_PLANS,
  type PremiumPlan,
} from '../premium/premium-plans';
import { MomoService } from './momo.service';
import {
  type MomoIpn,
  momoOrderId,
  momoOutcome,
  orderCodeFromMomoOrderId,
} from './momo.util';
import { PayosService } from './payos.service';

export type PaymentProvider = 'payos' | 'momo';

/** Đơn PENDING tạo trong ngần này ngày được job đối soát hỏi lại cổng thanh toán (link payOS mặc định hết hạn sau 1 ngày). */
const RECONCILE_WINDOW_MS = 7 * 86_400_000;

/**
 * ĐƠN HÀNG PREMIUM — tạo đơn, xác nhận đã trả, cộng hạn Premium. Bán qua 2 cổng, chung 1 bảng `PaymentOrder` (cột
 * `provider`):
 * - **payOS** (mặc định): chuyển khoản/quét VietQR — app ngân hàng nào cũng quét được, cả ví MoMo — tiền về thẳng tài
 *   khoản ngân hàng đã liên kết ở my.payos.vn, Hanni KHÔNG giữ tiền hộ ai. Miễn phí, cá nhân đăng ký bằng CCCD, KHÔNG có
 *   môi trường test riêng (thử bằng giao dịch thật số tiền nhỏ — payos.vn/docs/moi-truong-test).
 * - **MoMo**: trang thanh toán của MoMo (ví MoMo / thẻ ATM / thẻ quốc tế) — xem MomoService (mặc định sandbox).
 *
 * File trong thư mục `payments/`:
 *   payments.controller.ts   route (khối BẢN ĐỒ đầu file: route nào do nút nào gọi)
 *   payments.service.ts      file này — nghiệp vụ đơn hàng, giống nhau cho mọi cổng
 *   payos.service.ts         gọi payOS: tạo link, hỏi trạng thái, xác thực webhook
 *   momo.service.ts          gọi MoMo: tạo giao dịch, hỏi trạng thái, xác thực IPN
 *   momo.util.ts             chữ ký MoMo + bảng mã kết quả (`momoOutcome`) — hàm thuần, có test
 *   payments.service.spec.ts test các luật xác nhận đơn (chạy: npx jest payments)
 *
 * Luồng 1 lần mua (đọc theo thứ tự):
 *   1. Popup Premium (client `components/premium-modal.tsx`) → POST /payments/premium-checkout { planKey, provider } →
 *      `createPremiumCheckout()` tạo `PaymentOrder` PENDING + gọi cổng tạo link → trình duyệt sang trang thanh toán.
 *   2. Người dùng trả tiền. Đơn được xác nhận bằng 1 trong 3 đường — CẢ 3 đều đi qua `grantPaidOrder()` nên Premium chỉ
 *      được cộng đúng 1 lần dù đường nào tới trước:
 *      a. cổng gọi thẳng server: payOS → POST /payments/webhook/payos (`handleWebhook`), MoMo → POST
 *         /payments/webhook/momo (`handleMomoIpn`) — xác thực chữ ký HMAC trước khi tin dữ liệu;
 *      b. người dùng quay về `/account?premium=<mã đơn>` → client hỏi GET /payments/orders/:orderCode → `getOrderStatus()`
 *         tự hỏi lại cổng (`syncOrder`) nếu đơn còn PENDING;
 *      c. job `reconcilePending()` mỗi 5 phút hỏi lại mọi đơn PENDING trong 7 ngày — theo khuyến nghị "đồng bộ trạng thái
 *         thanh toán" của payOS: webhook có thể không tới (chưa khai Webhook URL, server đang khởi động lại, mạng chập
 *         chờn). Lỗi thật 2026-10-27: 2 đơn trả xong trên payOS nhưng chưa khai webhook → Premium không lên; nay job này
 *         tự cộng.
 *   3. `grantPaidOrder()`: so số tiền với đơn → UPDATE … WHERE status = PENDING (chỉ 1 lượt thắng) → cộng hạn
 *      `User.premiumUntil` (nối tiếp hạn cũ, `extendPremiumUntil`).
 *   Cổng báo huỷ / hết hạn / thất bại (payOS CANCELLED·EXPIRED·FAILED, MoMo mã trong `MOMO_FAILED_CODES`) → `cancelOrder()`
 *   chuyển đơn sang CANCELLED để trang Tài khoản báo đúng "đã huỷ" và job đối soát thôi hỏi lại.
 *
 * Để trống `PAYOS_*` / `MOMO_*` thì cổng đó tự tắt (popup không hiện), KHÔNG chặn app khởi động, giống `GEMINI_API_KEY`.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly orders: Repository<PaymentOrder>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService<Env, true>,
    private readonly payos: PayosService,
    private readonly momo: MomoService,
  ) {}

  /**
   * Cổng nào đang bật — popup Premium chỉ hiện lựa chọn của cổng đã cấu hình. `configured` giữ cho client cũ.
   * MoMo chỉ hiện khi đơn MoMo cộng được Premium thật: khoá thật, hoặc khoá thử khi chạy local. Trên production mà
   * mới có khoá thử (chưa có giấy phép kinh doanh để lấy khoá thật) thì ẩn — người dùng thật không gặp cổng tiền ảo.
   */
  providers() {
    const payos = this.payos.isConfigured();
    const momo = this.momo.isConfigured() && this.momo.grantsPremium();
    return {
      configured: payos || momo,
      payos,
      momo,
      momoSandbox: momo && this.momo.isSandbox(),
    };
  }

  /** Tạo đơn Premium + link thanh toán ở cổng đã chọn; xong người dùng được đưa về `/account?premium=<mã đơn>`. */
  async createPremiumCheckout(
    userId: string,
    planKey: string,
    provider: PaymentProvider = 'payos',
  ): Promise<{
    checkoutUrl: string;
    qrCode: string | null;
    orderCode: number;
  }> {
    const plan = PREMIUM_PLANS.find((p) => p.key === planKey);
    if (!plan) throw new BadRequestException('Không tìm thấy gói Premium này');
    if (provider === 'momo' && !this.providers().momo)
      throw new ServiceUnavailableException('Chưa mở thanh toán qua MoMo');
    return provider === 'momo'
      ? this.createMomoCheckout(userId, plan)
      : this.createPayosCheckout(userId, plan);
  }

  private async createPayosCheckout(userId: string, plan: PremiumPlan) {
    if (!this.payos.isConfigured())
      throw new ServiceUnavailableException('Thanh toán đang tạm đóng — thử lại sau nhé');
    const order = await insertAndReturn(this.orders, {
      userId,
      amountVnd: plan.priceVnd,
      premiumPlanKey: plan.key,
      provider: 'PAYOS',
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    try {
      const link = await this.payos.createPaymentLink({
        orderCode: order.orderCode,
        amount: plan.priceVnd,
        // Nội dung chuyển khoản. payOS: tài khoản ngân hàng KHÔNG liên kết qua payOS chỉ nhận tối đa 9 ký tự (tài liệu
        // API "Tạo link thanh toán", trường description) — bản cũ "Hanni Premium #123" dài 18 ký tự thì payOS từ chối
        // tạo link với các tài khoản đó. "HN" + mã đơn vừa 9 ký tự tới đơn thứ 9.999.999, vẫn tra được đơn trong sao kê.
        description: `HN${order.orderCode}`,
        returnUrl: `${frontendUrl}/account?premium=${order.orderCode}`,
        cancelUrl: `${frontendUrl}/account?premium=${order.orderCode}&cancelled=1`,
      });

      await this.orders.update(order.id, { providerRef: link.paymentLinkId });

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

  private async createMomoCheckout(userId: string, plan: PremiumPlan) {
    if (!this.momo.isConfigured())
      throw new ServiceUnavailableException('Chưa mở thanh toán qua MoMo');
    const order = await insertAndReturn(this.orders, {
      userId,
      amountVnd: plan.priceVnd,
      premiumPlanKey: plan.key,
      provider: 'MOMO',
    });
    const ref = momoOrderId(order.orderCode, Date.now());
    await this.orders.update(order.id, { providerRef: ref });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const apiUrl = `${this.config.get('APP_URL', { infer: true })}${this.config.get('API_PREFIX', { infer: true })}`;
    try {
      const { payUrl } = await this.momo.createPayment({
        orderId: ref,
        amount: plan.priceVnd,
        // Chỉ chữ không dấu: trang MoMo hiện nguyên văn, ký tự lạ dễ bị từ chối.
        orderInfo: `Hanni Premium ${order.orderCode}`,
        redirectUrl: `${frontendUrl}/account?premium=${order.orderCode}`,
        ipnUrl: `${apiUrl}/payments/webhook/momo`,
      });
      return { checkoutUrl: payUrl, qrCode: null, orderCode: order.orderCode };
    } catch (err) {
      await this.orders.update(order.id, {
        status: PaymentOrderStatus.CANCELLED,
      });
      throw err;
    }
  }

  /** Trạng thái 1 đơn cho trang /account sau khi cổng thanh toán đưa người dùng quay về. Đơn còn PENDING thì hỏi lại
   * cổng ngay (`syncOrder`) — không chờ webhook/IPN, vốn có thể tới chậm hoặc không tới. */
  async getOrderStatus(userId: string, orderCode: number) {
    let order = await this.orders.findOneBy({ orderCode });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn thanh toán');
    }
    if (order.status === PaymentOrderStatus.PENDING) {
      await this.syncOrder(order);
      order = (await this.orders.findOneBy({ id: order.id })) ?? order;
    }
    return {
      orderCode: order.orderCode,
      amountVnd: order.amountVnd,
      premiumPlanKey: order.premiumPlanKey,
      status: order.status,
      provider: order.provider,
    };
  }

  /** payOS gọi thẳng endpoint này (không qua JWT) khi có giao dịch — xác thực bằng `webhooks.verify()` của SDK
   * (HMAC-SHA256 với checksum key), KHÔNG tin dữ liệu gửi lên nếu chưa xác thực được. Chỉ xử lý giao dịch thành công
   * (`data.code === "00"` như mẫu webhook ở payos.vn/docs/du-lieu-tra-ve/webhook). payOS có thể gọi lại nhiều lần cho
   * cùng giao dịch — `grantPaidOrder` chặn xử lý trùng. Lúc khai Webhook URL payOS gửi 1 webhook thử (đơn 123 không có
   * thật) — vẫn trả 200 để được nhận. */
  async handleWebhook(payload: Webhook): Promise<void> {
    let verified: Awaited<ReturnType<PayosService['verifyWebhook']>>;
    try {
      verified = await this.payos.verifyWebhook(payload);
    } catch (err) {
      this.logger.warn(`Webhook payOS không xác thực được: ${err}`);
      return;
    }
    if (verified.code !== '00') {
      this.logger.warn(
        `Webhook payOS không phải giao dịch thành công: orderCode=${verified.orderCode} code=${verified.code}`,
      );
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
    await this.grantPaidOrder(order, verified.amount, 'webhook payOS');
  }

  /** MoMo gọi ipnUrl (POST /payments/webhook/momo) khi giao dịch có kết quả. Xác thực chữ ký (có transId) rồi mới tin;
   * resultCode 0 = đã trả → cộng Premium; mã thất bại (huỷ, hết hạn, thẻ bị từ chối… — `momoOutcome`) → huỷ đơn; mã khác
   * để nguyên, đối soát hỏi lại sau. */
  async handleMomoIpn(body: MomoIpn): Promise<void> {
    if (!this.momo.verifyIpn(body)) {
      this.logger.warn(
        `IPN MoMo không xác thực được: orderId=${body?.orderId}`,
      );
      return;
    }
    const outcome = momoOutcome(body.resultCode);
    if (outcome !== 'paid' && outcome !== 'failed') return;
    const orderCode = orderCodeFromMomoOrderId(body.orderId);
    const order = orderCode ? await this.orders.findOneBy({ orderCode }) : null;
    if (
      !order ||
      order.provider !== 'MOMO' ||
      order.providerRef !== body.orderId
    ) {
      this.logger.warn(`IPN MoMo cho đơn không khớp: orderId=${body.orderId}`);
      return;
    }
    if (outcome === 'failed') {
      await this.cancelOrder(
        order,
        `IPN MoMo resultCode=${body.resultCode} ${body.message ?? ''}`,
      );
      return;
    }
    await this.grantPaidOrder(
      order,
      Number(body.amount),
      `IPN MoMo transId=${body.transId}`,
    );
  }

  /** Mỗi 5 phút: hỏi lại cổng thanh toán mọi đơn còn PENDING tạo trong 7 ngày qua (xem đường c ở đầu file). */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePending(): Promise<void> {
    const pending = await this.orders.find({
      where: {
        status: PaymentOrderStatus.PENDING,
        provider: In(['PAYOS', 'MOMO']),
        createdAt: MoreThan(new Date(Date.now() - RECONCILE_WINDOW_MS)),
      },
      order: { createdAt: 'ASC' },
      take: 50,
    });
    for (const order of pending) await this.syncOrder(order);
  }

  /** Hỏi cổng thanh toán trạng thái THẬT của 1 đơn (server → cổng, có khoá) rồi cập nhật đơn: đã trả → cộng Premium,
   * huỷ/hết hạn → CANCELLED. Lỗi mạng thì để nguyên, lần đối soát sau hỏi tiếp. */
  private async syncOrder(order: PaymentOrder): Promise<void> {
    try {
      if (order.provider === 'MOMO') {
        if (!order.providerRef) return;
        const q = await this.momo.queryStatus(order.providerRef);
        if (!q) return; // lỗi mạng — lượt sau hỏi lại
        const outcome = momoOutcome(q.resultCode);
        if (outcome === 'paid')
          await this.grantPaidOrder(
            order,
            q.amount,
            `đối soát MoMo transId=${q.transId}`,
          );
        else if (outcome === 'failed')
          await this.cancelOrder(order, `MoMo resultCode=${q.resultCode}`);
        return;
      }
      if (!this.payos.isConfigured()) return;
      const link = await this.payos.getPaymentStatus(order.orderCode);
      if (link.status === 'PAID') {
        await this.grantPaidOrder(order, link.amountPaid, 'đối soát payOS');
      } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(link.status)) {
        await this.cancelOrder(order, `payOS ${link.status}`);
      }
    } catch (err) {
      this.logger.warn(
        `Đối soát đơn #${order.orderCode} (${order.provider}) lỗi: ${err}`,
      );
    }
  }

  /** Cổng báo giao dịch huỷ / hết hạn / thất bại → CANCELLED. Có điều kiện status = PENDING: đơn đã PAID không bao giờ bị
   * huỷ ngược. */
  private async cancelOrder(order: PaymentOrder, reason: string) {
    const res = await this.orders.update(
      { id: order.id, status: PaymentOrderStatus.PENDING },
      { status: PaymentOrderStatus.CANCELLED },
    );
    if (res.affected)
      this.logger.log(`Đơn #${order.orderCode} huỷ (${reason})`);
  }

  /** Đơn được cổng xác nhận đã trả `paidAmount` → PAID (đúng 1 lần) → cộng hạn Premium. Dùng chung webhook, IPN, đối
   * soát. `source` chỉ để ghi log đối soát. */
  private async grantPaidOrder(
    order: PaymentOrder,
    paidAmount: number,
    source: string,
  ): Promise<void> {
    if (order.status !== PaymentOrderStatus.PENDING) return; // đã xử lý rồi (đọc nhanh, tránh việc thừa — xem chặn thật ở dưới)

    // So khớp số tiền — phòng payload bị chỉnh sửa dù đã qua xác thực (vd lỗi tích hợp phía cổng), không tin thẳng số
    // tiền cổng gửi.
    if (paidAmount < order.amountVnd) {
      this.logger.error(
        `Đơn #${order.orderCode} lệch số tiền (${source}): đơn=${order.amountVnd} nhận=${paidAmount}`,
      );
      return;
    }

    // Chuyển PENDING -> PAID bằng UPDATE có ĐIỀU KIỆN status = PENDING (atomic ở tầng DB) thay vì đọc-rồi-ghi — webhook,
    // IPN, đối soát và việc payOS gọi lại webhook nhiều lần có thể chạy gần như đồng thời cho cùng 1 đơn. CHỈ 1 lượt
    // thắng được điều kiện này, `affected === 0` nghĩa là lượt khác đã xử lý xong — bỏ qua an toàn.
    const claimed = await this.orders.update(
      { id: order.id, status: PaymentOrderStatus.PENDING },
      { status: PaymentOrderStatus.PAID, paidAt: new Date() },
    );
    if (!claimed.affected) return;

    // Phòng hờ đơn MoMo khoá thử tạo trên production trước 28/10 (khi cổng thử còn hiện) — tiền ảo, không cộng.
    if (order.provider === 'MOMO' && !this.momo.grantsPremium()) {
      this.logger.warn(
        `Đơn #${order.orderCode} trả qua MoMo SANDBOX (tiền ảo) trên production — không cộng Premium (${source})`,
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
      this.logger.log(
        `Đơn #${order.orderCode} (${order.provider}, ${order.amountVnd}đ) đã thanh toán — Premium tới ${newUntil.toISOString()} (${source})`,
      );
    } catch (err) {
      // Đơn đã chắc chắn PAID (đã thanh toán thật) nhưng gia hạn Premium thất bại — KHÔNG lùi lại PENDING (lượt sau sẽ bị
      // chặn bởi điều kiện ở trên, không tự sửa được) — log ERROR rõ ràng để đối soát thủ công, còn hơn nuốt lỗi im lặng
      // khiến người dùng mất tiền thật mà không ai biết.
      this.logger.error(
        `Đơn #${order.orderCode} đã PAID nhưng gia hạn Premium thất bại — cần đối soát thủ công: ${err}`,
      );
    }
  }
}
