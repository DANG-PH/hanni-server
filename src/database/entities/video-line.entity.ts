import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Video } from './video.entity';

/** Một câu trong bản chép của video. */
@Entity('VideoLine')
@Index('VideoLine_videoId_idx', ['videoId'])
@Index('VideoLine_videoId_index_key', ['videoId', 'index'], { unique: true })
export class VideoLine {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'VideoLine_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  videoId!: string;

  @ManyToOne(() => Video, (x) => x.lines, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'videoId',
    foreignKeyConstraintName: 'VideoLine_videoId_fkey',
  })
  video!: Video;

  /** 1-based */
  @Column({ type: 'integer' })
  index!: number;

  /** mốc thời gian trong video (nếu có) */
  @Column({ type: 'integer', nullable: true })
  startMs!: number | null;

  @Column({ type: 'text' })
  zh!: string;

  /** âm tiết cách nhau bằng khoảng trắng (dấu thanh) */
  @Column({ type: 'text' })
  pinyin!: string;

  /** pinyin số — để tô màu theo thanh điệu */
  @Column({ type: 'text', default: '' })
  pinyinNum!: string;

  @Column({ type: 'text', nullable: true })
  vi!: string | null;
}
