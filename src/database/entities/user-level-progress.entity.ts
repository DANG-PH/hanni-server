import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HskLevel } from './hsk-level.entity';
import { User } from './user.entity';

/** Cache đọc O(1) cho dashboard — cập nhật tăng dần sau mỗi review. */
@Entity('UserLevelProgress')
@Index('UserLevelProgress_userId_hskLevel_key', ['userId', 'hskLevel'], {
  unique: true,
})
export class UserLevelProgress {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'UserLevelProgress_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.levelProgress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserLevelProgress_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer' })
  hskLevel!: number;

  @ManyToOne(() => HskLevel, (x) => x.levelProgress, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'hskLevel',
    referencedColumnName: 'level',
    foreignKeyConstraintName: 'UserLevelProgress_hskLevel_fkey',
  })
  level!: HskLevel;

  @Column({ type: 'integer', default: 0 })
  totalWords!: number;

  @Column({ type: 'integer', default: 0 })
  learnedWords!: number;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  completedAt!: Date | null;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
