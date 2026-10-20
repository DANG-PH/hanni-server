import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateOnly } from '../transformers';
import { User } from './user.entity';

/** 1 dòng / (user, ngày-địa-phương). Nền cho streak, mục tiêu ngày, biểu đồ. */
@Entity('UserDailyActivity')
@Index('UserDailyActivity_userId_localDate_idx', ['userId', 'localDate']) // DB: ("userId", "localDate" DESC)
@Index('UserDailyActivity_userId_localDate_key', ['userId', 'localDate'], {
  unique: true,
})
export class UserDailyActivity {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'UserDailyActivity_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.dailyActivity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserDailyActivity_userId_fkey',
  })
  user!: User;

  /** ngày theo timezone của user (chỉ phần date) */
  @Column({ type: 'date', transformer: dateOnly })
  localDate!: Date;

  @Column({ type: 'integer', default: 0 })
  wordsReviewed!: number;

  @Column({ type: 'integer', default: 0 })
  wordsLearned!: number;

  @Column({ type: 'double precision', default: 0 })
  minutesStudied!: number;

  @Column({ type: 'boolean', default: false })
  goalMet!: boolean;

  @Column({ type: 'integer', default: 0 })
  xp!: number;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
