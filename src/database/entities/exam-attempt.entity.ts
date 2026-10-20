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
 * BẢNG CŨ — tính năng /exams cũ đã gỡ 2026-10-19, không code nào còn đọc/ghi; giữ để không mất dữ liệu.
 * Kết quả một lần làm bài Kiểm tra HSK (quiz sinh từ từ vựng theo cấp).
 */
@Entity('ExamAttempt')
@Index('ExamAttempt_userId_createdAt_idx', ['userId', 'createdAt']) // DB: ("userId", "createdAt" DESC)
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ExamAttempt_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.examAttempts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'ExamAttempt_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer' })
  hskLevel!: number;

  @Column({ type: 'integer' })
  totalCount!: number;

  @Column({ type: 'integer' })
  correctCount!: number;

  @Column({ type: 'integer', nullable: true })
  durationSec!: number | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
