import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Achievement } from './achievement.entity';
import { User } from './user.entity';

@Entity('UserAchievement')
@Index(
  'UserAchievement_userId_achievementId_key',
  ['userId', 'achievementId'],
  { unique: true },
)
@Index('UserAchievement_userId_idx', ['userId'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'UserAchievement_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.achievements, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserAchievement_userId_fkey',
  })
  user!: User;

  @Column({ type: 'uuid' })
  achievementId!: string;

  @ManyToOne(() => Achievement, (x) => x.users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'achievementId',
    foreignKeyConstraintName: 'UserAchievement_achievementId_fkey',
  })
  achievement!: Achievement;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  unlockedAt!: Date;

  @Column({ type: 'integer', default: 0 })
  progressValue!: number;
}
