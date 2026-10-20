import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * KHÔNG CÒN DÙNG (bỏ hệ thống xu 2026-10-20) — ví xu cũ, giữ bảng làm lịch sử, không code nào đọc/ghi.
 */
@Entity('UserWallet')
export class UserWallet {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'UserWallet_pkey' })
  userId!: string;

  @OneToOne(() => User, (x) => x.wallet, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserWallet_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer', default: 0 })
  balance!: number;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
