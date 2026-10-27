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
import { SrsState } from '../enums';
import { ReviewLog } from './review-log.entity';
import { User } from './user.entity';
import { Word } from './word.entity';

/**
 * Trạng thái SRS: 1 dòng / (user, word). Chứa superset trường của SM-2 và FSRS
 * để đổi thuật toán không cần migration.
 */
@Entity('UserWordProgress')
@Index('UserWordProgress_userId_dueAt_idx', ['userId', 'dueAt'])
@Index('UserWordProgress_userId_hskLevel_dueAt_idx', [
  'userId',
  'hskLevel',
  'dueAt',
])
@Index('UserWordProgress_userId_state_idx', ['userId', 'state'])
@Index('UserWordProgress_userId_wordId_key', ['userId', 'wordId'], {
  unique: true,
})
export class UserWordProgress {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'UserWordProgress_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.wordProgress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserWordProgress_userId_fkey',
  })
  user!: User;

  @Column({ type: 'uuid' })
  wordId!: string;

  @ManyToOne(() => Word, (x) => x.progress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'wordId',
    foreignKeyConstraintName: 'UserWordProgress_wordId_fkey',
  })
  word!: Word;

  /** denormalize từ Word.hskLevel — để lọc "chỉ ôn HSK 2" không cần join. */
  @Column({ type: 'integer' })
  hskLevel!: number;

  @Column({
    type: 'enum',
    enum: SrsState,
    enumName: 'SrsState',
    default: 'NEW',
  })
  state!: SrsState;

  /** --- dùng chung --- */
  @Column({ type: 'timestamp', precision: 3, nullable: true })
  dueAt!: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  lastReviewedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  reps!: number;

  @Column({ type: 'integer', default: 0 })
  lapses!: number;

  /** mốc "" lần đầu */
  @Column({ type: 'timestamp', precision: 3, nullable: true })
  learnedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isSuspended!: boolean;

  @Column({ type: 'boolean', default: false })
  isLeech!: boolean;

  /** --- SM-2 --- */
  @Column({ type: 'double precision', default: () => '2.5' })
  easeFactor!: number;

  @Column({ type: 'double precision', default: 0 })
  intervalDays!: number;

  /** --- FSRS --- */
  @Column({ type: 'double precision', nullable: true })
  stability!: number | null;

  @Column({ type: 'double precision', nullable: true })
  difficulty!: number | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToMany(() => ReviewLog, (x) => x.progress)
  reviewLogs!: ReviewLog[];
}
