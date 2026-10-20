import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Video } from './video.entity';

/** Tiến độ xem video của từng user. */
@Entity('UserVideoProgress')
@Index('UserVideoProgress_userId_idx', ['userId'])
@Index('UserVideoProgress_userId_videoId_key', ['userId', 'videoId'], {
  unique: true,
})
export class UserVideoProgress {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'UserVideoProgress_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.videoProgress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserVideoProgress_userId_fkey',
  })
  user!: User;

  @Column({ type: 'uuid' })
  videoId!: string;

  @ManyToOne(() => Video, (x) => x.progress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'videoId',
    foreignKeyConstraintName: 'UserVideoProgress_videoId_fkey',
  })
  video!: Video;

  @Column({ type: 'integer', default: 0 })
  lastLineIndex!: number;

  @Column({ type: 'integer', default: 0 })
  linesRead!: number;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  completedAt!: Date | null;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
