/* eslint-disable @typescript-eslint/require-await -- bản giả repo/cổng thanh toán trả Promise cho giống thật */
import { PaymentOrderStatus } from '../../database/enums';
import { PaymentsService } from './payments.service';

// Gói ESM jest không nạp được — test chỉ cần logic, không cần lịch chạy (cổng payOS/MoMo là bản giả bên dưới).
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_5_MINUTES: '*/5 * * * *' },
}));
jest.mock('@payos/node', () => ({ PayOS: class {} }));

/**
 * Logic xác nhận đơn (tiền thật): webhook / quay về trang Tài khoản / đối soát đều đi qua grantPaidOrder.
 * Repo và cổng thanh toán là bản giả trong bộ nhớ — kiểm đúng các luật, không gọi mạng.
 */
type Order = {
  id: string;
  orderCode: number;
  userId: string;
  amountVnd: number;
  kind: string;
  premiumPlanKey: string;
  status: PaymentOrderStatus;
  provider: string;
  providerRef: string | null;
  createdAt: Date;
};

function setup(
  opts: {
    order?: Partial<Order>;
    payosStatus?: string;
    amountPaid?: number;
    momoGrants?: boolean;
    momoResultCode?: number;
  } = {},
) {
  const order: Order = {
    id: 'o1',
    orderCode: 2,
    userId: 'u1',
    amountVnd: 89000,
    kind: 'PREMIUM',
    premiumPlanKey: 'half_year',
    status: PaymentOrderStatus.PENDING,
    provider: 'PAYOS',
    providerRef: null,
    createdAt: new Date(),
    ...opts.order,
  };
  let premiumUntil: Date | null = null;
  const userUpdates: Date[] = [];
  const orders = {
    findOneBy: jest.fn(async (w: { orderCode?: number; id?: string }) =>
      w.orderCode === order.orderCode || w.id === order.id
        ? { ...order }
        : null,
    ),
    find: jest.fn(async () =>
      order.status === PaymentOrderStatus.PENDING ? [{ ...order }] : [],
    ),
    // UPDATE … WHERE id = ? AND status = PENDING — chỉ thắng khi đơn còn PENDING (như Postgres)
    update: jest.fn(
      async (
        where: { id: string; status?: PaymentOrderStatus },
        set: Partial<Order>,
      ) => {
        if (
          where.id !== order.id ||
          (where.status && where.status !== order.status)
        )
          return { affected: 0 };
        Object.assign(order, set);
        return { affected: 1 };
      },
    ),
  };
  const users = {
    findOneOrFail: jest.fn(async () => ({ id: 'u1', premiumUntil })),
    update: jest.fn(async (_id: string, set: { premiumUntil: Date }) => {
      premiumUntil = set.premiumUntil;
      userUpdates.push(set.premiumUntil);
    }),
  };
  const config = { get: jest.fn(() => '') };
  const payos = {
    isConfigured: () => true,
    getPaymentStatus: jest.fn(async () => ({
      status: opts.payosStatus ?? 'PAID',
      amountPaid: opts.amountPaid ?? order.amountVnd,
    })),
    verifyWebhook: jest.fn(async (p: { data: unknown }) => p.data),
  };
  const momo = {
    isConfigured: () => true,
    isSandbox: () => true,
    grantsPremium: () => opts.momoGrants ?? true,
    queryStatus: jest.fn(async () => ({
      resultCode: opts.momoResultCode ?? 0,
      amount: order.amountVnd,
      transId: '1',
    })),
    verifyIpn: () => true,
  };
  const svc = new PaymentsService(
    orders as never,
    users as never,
    config as never,
    payos as never,
    momo as never,
  );
  return { svc, order, orders, users, userUpdates, payos, momo };
}

describe('PaymentsService — xác nhận đơn', () => {
  it('đối soát: payOS báo PAID → đơn PAID + cộng Premium (lỗi thật: chưa khai webhook mà đã trả tiền)', async () => {
    const { svc, order, userUpdates } = setup();
    await svc.reconcilePending();
    expect(order.status).toBe(PaymentOrderStatus.PAID);
    expect(userUpdates).toHaveLength(1);
  });

  it('webhook + đối soát + quay về trang cùng lúc → chỉ cộng Premium 1 lần', async () => {
    const { svc, order, userUpdates } = setup();
    const hook = {
      code: '00',
      desc: 'success',
      success: true,
      signature: 'x',
      data: { orderCode: 2, amount: 89000, code: '00' },
    };
    await Promise.all([
      svc.handleWebhook(hook as never),
      svc.reconcilePending(),
      svc.getOrderStatus('u1', 2),
    ]);
    expect(order.status).toBe(PaymentOrderStatus.PAID);
    expect(userUpdates).toHaveLength(1);
  });

  it('trả thiếu tiền → không cộng, đơn vẫn PENDING', async () => {
    const { svc, order, userUpdates } = setup({ amountPaid: 19000 });
    await svc.reconcilePending();
    expect(order.status).toBe(PaymentOrderStatus.PENDING);
    expect(userUpdates).toHaveLength(0);
  });

  it('webhook không phải giao dịch thành công (code khác "00") → bỏ qua', async () => {
    const { svc, order, userUpdates } = setup();
    await svc.handleWebhook({
      code: '01',
      success: false,
      signature: 'x',
      data: { orderCode: 2, amount: 89000, code: '01' },
    } as never);
    expect(order.status).toBe(PaymentOrderStatus.PENDING);
    expect(userUpdates).toHaveLength(0);
  });

  it('payOS báo CANCELLED / EXPIRED → đơn CANCELLED, không cộng', async () => {
    for (const s of ['CANCELLED', 'EXPIRED']) {
      const { svc, order, userUpdates } = setup({ payosStatus: s });
      await svc.reconcilePending();
      expect(order.status).toBe(PaymentOrderStatus.CANCELLED);
      expect(userUpdates).toHaveLength(0);
    }
  });

  it('trang Tài khoản hỏi trạng thái: đơn PENDING được hỏi lại payOS ngay và trả PAID', async () => {
    const { svc, payos } = setup();
    const r = await svc.getOrderStatus('u1', 2);
    expect(payos.getPaymentStatus).toHaveBeenCalledWith(2);
    expect(r.status).toBe(PaymentOrderStatus.PAID);
  });

  it('MoMo sandbox trên production → đơn PAID nhưng KHÔNG cộng Premium (tiền ảo)', async () => {
    const { svc, order, userUpdates } = setup({
      order: { provider: 'MOMO', providerRef: 'HN2T1' },
      momoGrants: false,
    });
    const r = await svc.getOrderStatus('u1', 2);
    expect(order.status).toBe(PaymentOrderStatus.PAID);
    expect(userUpdates).toHaveLength(0);
    expect(r.sandbox).toBe(true);
  });

  it('MoMo báo người dùng huỷ / link hết hạn (1006, 1005) → đơn CANCELLED, không cộng', async () => {
    for (const code of [1006, 1005]) {
      const { svc, order, userUpdates } = setup({
        order: { provider: 'MOMO', providerRef: 'HN2T1' },
        momoResultCode: code,
      });
      await svc.reconcilePending();
      expect(order.status).toBe(PaymentOrderStatus.CANCELLED);
      expect(userUpdates).toHaveLength(0);
    }
  });

  it('MoMo còn chờ người dùng xác nhận (1000) hoặc mã lạ (99) → để nguyên PENDING', async () => {
    for (const code of [1000, 99]) {
      const { svc, order } = setup({
        order: { provider: 'MOMO', providerRef: 'HN2T1' },
        momoResultCode: code,
      });
      await svc.reconcilePending();
      expect(order.status).toBe(PaymentOrderStatus.PENDING);
    }
  });

  it('IPN MoMo báo thất bại → huỷ đơn; đơn đã PAID thì không bị huỷ ngược', async () => {
    const fail = {
      orderId: 'HN2T1',
      resultCode: 1006,
      amount: 89000,
      transId: 9,
    };
    const a = setup({ order: { provider: 'MOMO', providerRef: 'HN2T1' } });
    await a.svc.handleMomoIpn(fail as never);
    expect(a.order.status).toBe(PaymentOrderStatus.CANCELLED);

    const b = setup({
      order: {
        provider: 'MOMO',
        providerRef: 'HN2T1',
        status: PaymentOrderStatus.PAID,
      },
    });
    await b.svc.handleMomoIpn(fail as never);
    expect(b.order.status).toBe(PaymentOrderStatus.PAID);
  });

  it('MoMo khoá thật: IPN hợp lệ → cộng Premium', async () => {
    const { svc, userUpdates } = setup({
      order: { provider: 'MOMO', providerRef: 'HN2T1' },
    });
    await svc.handleMomoIpn({
      orderId: 'HN2T1',
      resultCode: 0,
      amount: 89000,
      transId: 9,
    } as never);
    expect(userUpdates).toHaveLength(1);
  });
});
