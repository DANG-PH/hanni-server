import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Giới thiệu bạn mới — 1 user CHỈ được giới thiệu bởi ĐÚNG 1 người
 * (referredId unique). rewardedAt null cho tới khi referred hoàn thành
 * ngày học đầu tiên (xem ReferralsListener), lúc đó cả 2 nhận thưởng.
 */
@Entity('Referral')
@Index('Referral_referrerId_idx', ['referrerId'])
export class Referral {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'Referral_pkey' })
  id!: string;

  @Column({ type: 'uuid' })
  referrerId!: string;

  @ManyToOne(() => User, (x) => x.referralsSent, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'referrerId',
    foreignKeyConstraintName: 'Referral_referrerId_fkey',
  })
  referrer!: User;

  @Column({ type: 'uuid' })
  referredId!: string;

  @OneToOne(() => User, (x) => x.referredBy, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'referredId',
    foreignKeyConstraintName: 'Referral_referredId_fkey',
  })
  referred!: User;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  rewardedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
