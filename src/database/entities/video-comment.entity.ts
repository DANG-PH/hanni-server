import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Notification } from './notification.entity';
import { User } from './user.entity';
import { Video } from './video.entity';

/**
 * Bình luận ở trang xem video. `parentId` null = bình luận gốc; có giá trị =
 * trả lời (chỉ 1 cấp, không cho trả lời của trả lời — giữ giao diện đơn giản).
 */
@Entity('VideoComment')
@Index('VideoComment_userId_idx', ['userId'])
@Index('VideoComment_videoId_parentId_createdAt_idx', [
  'videoId',
  'parentId',
  'createdAt',
])
export class VideoComment {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'VideoComment_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  videoId!: string;

  @ManyToOne(() => Video, (x) => x.comments, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'videoId',
    foreignKeyConstraintName: 'VideoComment_videoId_fkey',
  })
  video!: Video;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.videoComments, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'VideoComment_userId_fkey',
  })
  user!: User;

  @Column({ type: 'varchar', length: 2000 })
  content!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => VideoComment, (x) => x.replies, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'parentId',
    foreignKeyConstraintName: 'VideoComment_parentId_fkey',
  })
  parent!: VideoComment | null;

  @OneToMany(() => VideoComment, (x) => x.parent)
  replies!: VideoComment[];

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToMany(() => Notification, (x) => x.comment)
  notifications!: Notification[];
}
