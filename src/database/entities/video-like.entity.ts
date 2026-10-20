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
import { Video } from './video.entity';

/** Lượt thích video — 1 user thích 1 video tối đa 1 lần. */
@Entity('VideoLike')
@Index('VideoLike_userId_videoId_key', ['userId', 'videoId'], { unique: true })
@Index('VideoLike_videoId_idx', ['videoId'])
export class VideoLike {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'VideoLike_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  videoId!: string;

  @ManyToOne(() => Video, (x) => x.likes, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'videoId',
    foreignKeyConstraintName: 'VideoLike_videoId_fkey',
  })
  video!: Video;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.videoLikes, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'VideoLike_userId_fkey',
  })
  user!: User;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
