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
 * Đơn thanh toán payOS — mua gói Premium (mô hình A2A, tiền về THẲNG tài khoản ngân hàng của Hanni, không qua
 * ví trung gian giữ tiền hộ). `orderCode` là số nguyên RIÊNG (không phải `id` UUID) vì payOS yêu cầu mã đơn
 * dạng số. Đơn `kind = TOPUP` (nạp xu) là của thời còn hệ thống xu (trước 2026-10-20).
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

  /** Số xu của đơn nạp xu cũ (1 VNĐ = 1 xu); 0 với đơn Premium. */
  @Column({ type: 'integer' })
  xuAmount!: number;

  /** PREMIUM (mua gói Premium) — TOPUP là đơn nạp xu cũ. */
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
