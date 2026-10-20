import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudySource } from '../enums';
import { QuizAttempt } from './quiz-attempt.entity';
import { ReviewLog } from './review-log.entity';
import { User } from './user.entity';

@Entity('StudySession')
@Index('StudySession_userId_startedAt_idx', ['userId', 'startedAt'])
export class StudySession {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'StudySession_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.studySessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'StudySession_userId_fkey',
  })
  user!: User;

  @Column({ type: 'enum', enum: StudySource, enumName: 'StudySource' })
  source!: StudySource;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  startedAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  cardsReviewed!: number;

  @Column({ type: 'integer', default: 0 })
  cardsCorrect!: number;

  @Column({ type: 'integer', default: 0 })
  newCards!: number;

  @OneToMany(() => ReviewLog, (x) => x.studySession)
  reviewLogs!: ReviewLog[];

  @OneToMany(() => QuizAttempt, (x) => x.studySession)
  quizAttempts!: QuizAttempt[];
}
