import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateOnly } from '../transformers';
import { User } from './user.entity';

/**
 * Đánh dấu nhiệm vụ hàng ngày ĐÃ NHẬN THƯỞNG — tiến độ mỗi nhiệm vụ tính
 * TRỰC TIẾP (live) từ ReviewLog/QuizAttempt/PracticeAttempt trong ngày,
 * bảng này CHỈ để chống thưởng xu 2 lần cho cùng 1 nhiệm vụ (xem
 * QuestsService.getToday()). `questKey` gồm cả khoá đặc biệt "all_done".
 */
@Entity('DailyQuestClaim')
@Index('DailyQuestClaim_userId_localDate_idx', ['userId', 'localDate'])
@Index(
  'DailyQuestClaim_userId_localDate_questKey_key',
  ['userId', 'localDate', 'questKey'],
  { unique: true },
)
export class DailyQuestClaim {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'DailyQuestClaim_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.dailyQuestClaims, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'DailyQuestClaim_userId_fkey',
  })
  user!: User;

  @Column({ type: 'date', transformer: dateOnly })
  localDate!: Date;

  @Column({ type: 'text' })
  questKey!: string;

  @Column({ type: 'integer' })
  xu!: number;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
