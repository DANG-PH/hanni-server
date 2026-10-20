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
import { PaymentOrderKind, PaymentOrderStatus } from '../enums';
import { User } from './user.entity';

/**
 * Giai đoạn 5 minigame (FEATURES.md) — nạp tiền thật lấy xu qua payOS
 * (mô hình A2A, tiền về THẲNG tài khoản ngân hàng của Hanni, không qua ví
 * trung gian giữ tiền hộ — khác lo ngại pháp lý ban đầu về "trung gian
 * thanh toán"). `orderCode` là số nguyên RIÊNG (không phải `id` UUID) vì
 * payOS yêu cầu mã đơn hàng dạng số; dùng `@default(autoincrement())` cho
 * đơn giản, không cần tự sinh + kiểm tra trùng.
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

  /**
   * = amountVnd (tỷ giá 1 VNĐ = 1 xu) — tách cột riêng để nếu sau này đổi
   * tỷ giá khuyến mãi thì không cần suy ngược từ amountVnd. 0 với đơn Premium.
   */
  @Column({ type: 'integer' })
  xuAmount!: number;

  /**
   * TOPUP (nạp xu) hay PREMIUM (mua gói Premium) — CÙNG 1 bảng/webhook để
   * tái dùng nguyên vẹn logic xác thực chữ ký + idempotent của payOS thay
   * vì dựng bảng/webhook riêng cho Premium.
   */
  @Column({
    type: 'enum',
    enum: PaymentOrderKind,
    enumName: 'PaymentOrderKind',
    default: 'TOPUP',
  })
  kind!: PaymentOrderKind;

  /** Key trong PREMIUM_PLANS (premium-plans.ts) — null nếu kind = TOPUP. */
  @Column({ type: 'text', nullable: true })
  premiumPlanKey!: string | null;

  @Column({
    type: 'enum',
    enum: PaymentOrderStatus,
    enumName: 'PaymentOrderStatus',
    default: 'PENDING',
  })
  status!: PaymentOrderStatus;

  @Column({ type: 'text', nullable: true })
  payosPaymentLinkId!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  paidAt!: Date | null;
}
