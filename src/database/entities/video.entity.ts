import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VideoKind } from '../enums';
import { Notification } from './notification.entity';
import { UserVideoProgress } from './user-video-progress.entity';
import { VideoComment } from './video-comment.entity';
import { VideoLike } from './video-like.entity';
import { VideoLine } from './video-line.entity';

/** Video YouTube kèm bản chép (transcript) + bản dịch tiếng Việt. */
@Entity('Video')
@Index('Video_hskLevel_idx', ['hskLevel'])
@Index('Video_sortOrder_createdAt_idx', ['sortOrder', 'createdAt'])
export class Video {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'Video_pkey' })
  id!: string;

  @Column({ type: 'text' })
  youtubeId!: string;

  /** tiêu đề tiếng Việt */
  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  titleZh!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'integer', nullable: true })
  hskLevel!: number | null;

  @Column({
    type: 'enum',
    enum: VideoKind,
    enumName: 'VideoKind',
    default: 'PODCAST',
  })
  kind!: VideoKind;

  @Column({ type: 'integer', default: 0 })
  sentenceCount!: number;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  /** tên kênh YouTube */
  @Column({ type: 'text', nullable: true })
  author!: string | null;

  @Column({ type: 'boolean', default: true })
  isFree!: boolean;

  /** nhỏ hiện trước; video hệ thống được xếp tay */
  @Column({ type: 'integer', default: 1000 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToMany(() => VideoLine, (x) => x.video)
  lines!: VideoLine[];

  @OneToMany(() => UserVideoProgress, (x) => x.video)
  progress!: UserVideoProgress[];

  @OneToMany(() => VideoComment, (x) => x.video)
  comments!: VideoComment[];

  @OneToMany(() => VideoLike, (x) => x.video)
  likes!: VideoLike[];

  @OneToMany(() => Notification, (x) => x.video)
  notifications!: Notification[];
}
