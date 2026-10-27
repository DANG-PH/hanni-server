import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('QuizAttempt')
@Index('QuizAttempt_userId_completedAt_idx', ['userId', 'completedAt'])
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'QuizAttempt_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.quizAttempts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'QuizAttempt_userId_fkey',
  })
  user!: User;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  startedAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  totalQuestions!: number;

  @Column({ type: 'integer', default: 0 })
  correctCount!: number;

  @Column({ type: 'double precision', default: 0 })
  scorePct!: number;
}
