import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateOnly } from '../transformers';
import { User } from './user.entity';

/** Denormalize chuỗi streak để đọc nhanh (1-1 User). */
@Entity('UserStreak')
export class UserStreak {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'UserStreak_pkey' })
  userId!: string;

  @OneToOne(() => User, (x) => x.streak, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserStreak_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer', default: 0 })
  currentStreak!: number;

  @Column({ type: 'integer', default: 0 })
  longestStreak!: number;

  @Column({ type: 'date', transformer: dateOnly, nullable: true })
  lastActiveLocalDate!: Date | null;

  @Column({ type: 'integer', default: 0 })
  streakFreezeCount!: number;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
