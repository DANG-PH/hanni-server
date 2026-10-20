import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameMode } from '../enums';
import { User } from './user.entity';

/**
 * Minigame "Dịch tốc độ": mỗi lượt chơi lưu SẴN bộ câu hỏi + đáp án đúng
 * (field `questions`, JSON) ngay lúc bắt đầu — khi nộp bài, server tự so
 * khớp lựa chọn với đáp án đã lưu thay vì tin vào điểm client tự báo (khác
 * QuizAttempt cũ vốn tin thẳng `isCorrect` từ client). `score`/`totalAsked`/
 * `durationMs`/`finishedAt` đều null cho tới khi nộp bài xong.
 */
@Entity('MinigameSession')
@Index('MinigameSession_finishedAt_idx', ['finishedAt'])
@Index('MinigameSession_userId_idx', ['userId'])
export class MinigameSession {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'MinigameSession_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.minigameSessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'MinigameSession_userId_fkey',
  })
  user!: User;

  /** TRANSLATE (Hán tự → nghĩa, mặc định) hay LISTENING (nghe → nghĩa) */
  @Column({
    type: 'enum',
    enum: GameMode,
    enumName: 'GameMode',
    default: 'TRANSLATE',
  })
  mode!: GameMode;

  @Column({ type: 'jsonb' })
  questions!: unknown;

  @Column({ type: 'integer', nullable: true })
  score!: number | null;

  @Column({ type: 'integer', nullable: true })
  totalAsked!: number | null;

  @Column({ type: 'integer', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  startedAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  finishedAt!: Date | null;
}
