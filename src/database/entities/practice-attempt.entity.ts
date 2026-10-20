import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PracticeSkill } from '../enums';
import { User } from './user.entity';
import { Word } from './word.entity';

/**
 * Một lượt luyện nghe hoặc luyện phát âm cho 1 từ. `isCorrect` chỉ có ý
 * nghĩa với LISTENING (so khớp Hán tự gõ vào) — PRONUNCIATION chưa có chấm
 * điểm tự động nên luôn null, chỉ ghi nhận "đã luyện".
 */
@Entity('PracticeAttempt')
@Index('PracticeAttempt_userId_skill_createdAt_idx', [
  'userId',
  'skill',
  'createdAt',
])
@Index('PracticeAttempt_wordId_idx', ['wordId'])
export class PracticeAttempt {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PracticeAttempt_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.practiceAttempts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'PracticeAttempt_userId_fkey',
  })
  user!: User;

  @Column({ type: 'uuid' })
  wordId!: string;

  @ManyToOne(() => Word, (x) => x.practiceAttempts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'wordId',
    foreignKeyConstraintName: 'PracticeAttempt_wordId_fkey',
  })
  word!: Word;

  @Column({ type: 'enum', enum: PracticeSkill, enumName: 'PracticeSkill' })
  skill!: PracticeSkill;

  @Column({ type: 'boolean', nullable: true })
  isCorrect!: boolean | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
