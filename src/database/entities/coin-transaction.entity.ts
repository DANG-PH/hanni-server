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
 * KHÔNG CÒN DÙNG (bỏ hệ thống xu 2026-10-20) — sổ giao dịch xu cũ, giữ bảng làm lịch sử để đối soát.
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
