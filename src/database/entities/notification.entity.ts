import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../enums';
import { Achievement } from './achievement.entity';
import { User } from './user.entity';
import { Video } from './video.entity';
import { VideoComment } from './video-comment.entity';

/**
 * Thông báo trong app, lưu DB để xem lại lịch sử; đẩy realtime qua
 * NotificationsGateway (Socket.IO) ngay khi tạo. Không xoá khi đã đọc — chỉ đánh dấu `readAt`.
 */
@Entity('Notification')
@Index('Notification_userId_createdAt_idx', ['userId', 'createdAt']) // DB: ("userId", "createdAt" DESC)
@Index('Notification_userId_readAt_idx', ['userId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'Notification_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.notifications, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'Notification_userId_fkey',
  })
  user!: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'NotificationType',
  })
  type!: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, (x) => x.notificationsCaused, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'actorId',
    foreignKeyConstraintName: 'Notification_actorId_fkey',
  })
  actor!: User | null;

  @Column({ type: 'uuid', nullable: true })
  videoId!: string | null;

  @ManyToOne(() => Video, (x) => x.notifications, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'videoId',
    foreignKeyConstraintName: 'Notification_videoId_fkey',
  })
  video!: Video | null;

  @Column({ type: 'uuid', nullable: true })
  commentId!: string | null;

  @ManyToOne(() => VideoComment, (x) => x.notifications, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'commentId',
    foreignKeyConstraintName: 'Notification_commentId_fkey',
  })
  comment!: VideoComment | null;

  @Column({ type: 'uuid', nullable: true })
  achievementId!: string | null;

  @ManyToOne(() => Achievement, (x) => x.notifications, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'achievementId',
    foreignKeyConstraintName: 'Notification_achievementId_fkey',
  })
  achievement!: Achievement | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
