import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AchievementCategory } from '../enums';
import { Notification } from './notification.entity';
import { UserAchievement } from './user-achievement.entity';

/** Danh mục huy hiệu (seed tĩnh). */
@Entity('Achievement')
@Index('Achievement_code_key', ['code'], { unique: true })
export class Achievement {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'Achievement_pkey',
  })
  id!: string;

  /** HSK1_COMPLETE, STREAK_7, ... */
  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'text' })
  nameVi!: string;

  @Column({ type: 'text' })
  descriptionVi!: string;

  @Column({ type: 'text', nullable: true })
  iconUrl!: string | null;

  @Column({
    type: 'enum',
    enum: AchievementCategory,
    enumName: 'AchievementCategory',
  })
  category!: AchievementCategory;

  @Column({ type: 'integer', default: 0 })
  threshold!: number;

  @Column({ type: 'jsonb', nullable: true })
  meta!: unknown;

  @OneToMany(() => UserAchievement, (x) => x.achievement)
  users!: UserAchievement[];

  @OneToMany(() => Notification, (x) => x.achievement)
  notifications!: Notification[];
}
