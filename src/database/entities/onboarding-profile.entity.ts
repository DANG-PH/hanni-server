import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OnboardingGoal } from '../enums';
import { User } from './user.entity';

/**
 * Khảo sát 1 lần khi mới dùng app (có thể làm lại) — dùng để tính
 * `recommendedLevel` (cấp HSK nên bắt đầu/ôn lại) bằng luật đơn giản
 * (không cần AI): dựa vào cấp tự đánh giá + số từ mới giữa các cấp
 * (`HskLevel.cumulative2025`) + nhịp học (`UserSettings.dailyGoalValue`)
 * để ước tính thời gian nếu có đặt hạn thi.
 */
@Entity('OnboardingProfile')
export class OnboardingProfile {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'OnboardingProfile_pkey',
  })
  userId!: string;

  @OneToOne(() => User, (x) => x.onboarding, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'OnboardingProfile_userId_fkey',
  })
  user!: User;

  @Column({ type: 'boolean' })
  hasStudiedBefore!: boolean;

  /** Cấp HSK tự đánh giá đã học tới đâu — null nếu `hasStudiedBefore = false`. */
  @Column({ type: 'integer', nullable: true })
  selfAssessedLevel!: number | null;

  @Column({ type: 'enum', enum: OnboardingGoal, enumName: 'OnboardingGoal' })
  goal!: OnboardingGoal;

  @Column({ type: 'boolean' })
  plansToTakeExam!: boolean;

  /** Cấp muốn thi — null nếu `plansToTakeExam = false`. */
  @Column({ type: 'integer', nullable: true })
  targetLevel!: number | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  targetDate!: Date | null;

  @Column({ type: 'integer' })
  recommendedLevel!: number;

  /** Đoạn giải thích lộ trình bằng tiếng Việt, sinh từ luật ở trên. */
  @Column({ type: 'text' })
  recommendationVi!: string;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  completedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
