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
 * Ví xu (soft currency) — KHÔNG quy đổi tiền thật, chỉ kiếm được qua
 * chơi/học và tiêu trong app (xem WalletService). Tách riêng khỏi mọi
 * hình thức tiền tệ premium/nạp tiền thật sau này (nếu có) để tránh vướng
 * quy định về trung gian thanh toán khi neo tỷ giá trực tiếp vào VNĐ.
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
