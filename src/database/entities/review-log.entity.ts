import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReviewRating, ReviewType, SrsState } from '../enums';
import { User } from './user.entity';
import { UserWordProgress } from './user-word-progress.entity';

/** Lịch sử review — append-only. Cần cho FSRS optimize + phân tích + streak. */
@Entity('ReviewLog')
@Index('ReviewLog_progressId_idx', ['progressId'])
@Index('ReviewLog_userId_reviewedAt_idx', ['userId', 'reviewedAt'])
@Index('ReviewLog_wordId_idx', ['wordId'])
export class ReviewLog {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ReviewLog_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.reviewLogs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'ReviewLog_userId_fkey',
  })
  user!: User;

  @Column({ type: 'uuid' })
  wordId!: string;

  @Column({ type: 'uuid' })
  progressId!: string;

  @ManyToOne(() => UserWordProgress, (x) => x.reviewLogs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'progressId',
    foreignKeyConstraintName: 'ReviewLog_progressId_fkey',
  })
  progress!: UserWordProgress;

  @Column({ type: 'enum', enum: ReviewRating, enumName: 'ReviewRating' })
  rating!: ReviewRating;

  @Column({ type: 'enum', enum: ReviewType, enumName: 'ReviewType' })
  reviewType!: ReviewType;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  reviewedAt!: Date;

  @Column({ type: 'enum', enum: SrsState, enumName: 'SrsState' })
  stateBefore!: SrsState;

  @Column({ type: 'enum', enum: SrsState, enumName: 'SrsState' })
  stateAfter!: SrsState;

  @Column({ type: 'double precision' })
  intervalBefore!: number;

  @Column({ type: 'double precision' })
  intervalAfter!: number;

  @Column({ type: 'double precision', nullable: true })
  easeBefore!: number | null;

  @Column({ type: 'double precision', nullable: true })
  easeAfter!: number | null;

  @Column({ type: 'double precision', nullable: true })
  stabilityBefore!: number | null;

  @Column({ type: 'double precision', nullable: true })
  stabilityAfter!: number | null;

  @Column({ type: 'double precision', nullable: true })
  difficultyBefore!: number | null;

  @Column({ type: 'double precision', nullable: true })
  difficultyAfter!: number | null;

  @Column({ type: 'double precision', default: 0 })
  elapsedDays!: number;

  @Column({ type: 'double precision', default: 0 })
  scheduledDays!: number;

  @Column({ type: 'integer', nullable: true })
  durationMs!: number | null;
}
