import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GoalType } from '../enums';
import { User } from './user.entity';

/** Cài đặt học của user (1-1 User). */
@Entity('UserSettings')
export class UserSettings {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'UserSettings_pkey',
  })
  userId!: string;

  @OneToOne(() => User, (x) => x.settings, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserSettings_userId_fkey',
  })
  user!: User;

  @Column({
    type: 'enum',
    enum: GoalType,
    enumName: 'GoalType',
    default: 'WORDS',
  })
  dailyGoalType!: GoalType;

  @Column({ type: 'integer', default: 20 })
  dailyGoalValue!: number;

  @Column({ type: 'integer', nullable: true })
  maxReviewsPerDay!: number | null;

  /** sm2 | fsrs */
  @Column({ type: 'text', default: 'sm2' })
  srsScheduler!: string;

  /** chỉ dùng cho FSRS */
  @Column({ type: 'double precision', default: () => '0.9' })
  targetRetention!: number;

  /** 0-23, giờ địa phương (cho push sau) */
  @Column({ type: 'integer', nullable: true })
  reminderHour!: number | null;

  /** email tổng kết tuần */
  @Column({ type: 'boolean', default: true })
  weeklyDigestEnabled!: boolean;

  /** cấp HSK người học CHỌN theo (1-7, 7 = HSK7-9); null = tự suy từ tiến độ */
  @Column({ type: 'integer', nullable: true })
  courseLevel!: number | null;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
