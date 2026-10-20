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
 * Đăng ký nhận thông báo đẩy của 1 thiết bị/trình duyệt. 1 user có thể có
 * nhiều thiết bị (điện thoại, máy tính…) → nhiều dòng.
 */
@Entity('PushSubscription')
@Index('PushSubscription_endpoint_key', ['endpoint'], { unique: true })
@Index('PushSubscription_userId_idx', ['userId'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PushSubscription_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.pushSubscriptions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'PushSubscription_userId_fkey',
  })
  user!: User;

  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ type: 'text' })
  p256dh!: string;

  @Column({ type: 'text' })
  auth!: string;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
