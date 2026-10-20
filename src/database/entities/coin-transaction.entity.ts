import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Sổ giao dịch xu — mỗi lần cộng/trừ đều ghi 1 dòng để đối soát, chống
 * gian lận/nhân bản xu do race condition (xem WalletService.debit() dùng
 * updateMany có điều kiện balance thay vì đọc-rồi-ghi).
 */
@Entity('CoinTransaction')
@Index('CoinTransaction_userId_createdAt_idx', ['userId', 'createdAt'])
export class CoinTransaction {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'CoinTransaction_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.coinTransactions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'CoinTransaction_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'text' })
  reason!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
