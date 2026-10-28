import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentOrderStatus } from '../enums';
import { User } from './user.entity';

/**
 * Đơn thanh toán (payOS hoặc MoMo, cột `provider`) — mua gói Premium (mô hình A2A, tiền về THẲNG tài khoản ngân hàng của Hanni, không qua
 * ví trung gian giữ tiền hộ). `orderCode` là số nguyên RIÊNG (không phải `id` UUID) vì payOS yêu cầu mã đơn
 * dạng số. Đơn nạp xu cũ (trước 2026-10-20, khi còn hệ thống xu) có `premiumPlanKey = null`.
 */
@Entity('PaymentOrder')
@Index('PaymentOrder_orderCode_key', ['orderCode'], { unique: true })
@Index('PaymentOrder_userId_createdAt_idx', ['userId', 'createdAt'])
export class PaymentOrder {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PaymentOrder_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.paymentOrders, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'PaymentOrder_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer' })
  @Generated('increment')
  orderCode!: number;

  @Column({ type: 'integer' })
  amountVnd!: number;

  /** Key trong PREMIUM_PLANS (premium-plans.ts) — null ở đơn nạp xu cũ. */
  @Column({ type: 'text', nullable: true })
  premiumPlanKey!: string | null;

  @Column({
    type: 'enum',
    enum: PaymentOrderStatus,
    enumName: 'PaymentOrderStatus',
    default: 'PENDING',
  })
  status!: PaymentOrderStatus;

  /** Cổng thanh toán: PAYOS (chuyển khoản/VietQR) | MOMO — đơn trước 2026-10-27 đều là PAYOS. */
  @Column({ type: 'text', default: 'PAYOS' })
  provider!: string;

  /** Mã đơn phía cổng: MoMo = orderId đã gửi MoMo (`HN<orderCode>T<thời điểm>`, dùng để tra trạng thái). */
  @Column({ type: 'text', nullable: true })
  providerRef!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  paidAt!: Date | null;
}
