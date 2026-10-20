import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('QuizAnswer')
@Index('QuizAnswer_quizAttemptId_idx', ['quizAttemptId'])
export class QuizAnswer {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'QuizAnswer_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  quizAttemptId!: string;

  @ManyToOne(() => QuizAttempt, (x) => x.answers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'quizAttemptId',
    foreignKeyConstraintName: 'QuizAnswer_quizAttemptId_fkey',
  })
  quizAttempt!: QuizAttempt;

  @Column({ type: 'uuid' })
  wordId!: string;

  @Column({ type: 'boolean' })
  isCorrect!: boolean;

  @Column({ type: 'text', nullable: true })
  chosen!: string | null;

  @Column({ type: 'text', nullable: true })
  correct!: string | null;

  @Column({ type: 'integer', nullable: true })
  responseMs!: number | null;
}
