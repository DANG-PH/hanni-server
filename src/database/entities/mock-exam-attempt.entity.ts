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
 * Một lần làm ĐỀ THI THỬ HSK đúng cấu trúc đề thật (đề nằm trong code —
 * `src/modules/mock-exams/papers/`, khoá theo `examSlug`). Khác `ExamAttempt`
 * (trắc nghiệm từ vựng tính giờ).
 */
@Entity('MockExamAttempt')
@Index('MockExamAttempt_userId_createdAt_idx', ['userId', 'createdAt']) // DB: ("userId", "createdAt" DESC)
@Index('MockExamAttempt_userId_examSlug_idx', ['userId', 'examSlug'])
export class MockExamAttempt {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'MockExamAttempt_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.mockExamAttempts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'MockExamAttempt_userId_fkey',
  })
  user!: User;

  @Column({ type: 'text' })
  examSlug!: string;

  @Column({ type: 'integer' })
  hskLevel!: number;

  @Column({ type: 'integer' })
  score!: number;

  @Column({ type: 'integer' })
  maxScore!: number;

  @Column({ type: 'boolean' })
  passed!: boolean;

  /** [{kind, correct, total, score}] từng phần thi (nghe/đọc/viết). */
  @Column({ type: 'jsonb' })
  sectionScores!: unknown;

  /** Đáp án đã chọn, `answers[no - 1]` — để xem lại bài làm sau này. */
  @Column({ type: 'jsonb' })
  answers!: unknown;

  @Column({ type: 'integer', nullable: true })
  durationSec!: number | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
