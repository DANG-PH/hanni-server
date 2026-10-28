import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LeagueWeek } from './league-week.entity';
import { User } from './user.entity';

/**
 * 1 người trong 1 tuần — `tier` mang từ tuần trước sang (thăng/giáng đúng
 * 1 bậc mỗi lần rollover), `movement` chỉ có giá trị SAU khi tuần đó đã kết
 * thúc (null trong lúc tuần đang diễn ra). Điểm tuần không lưu — luôn tính
 * trực tiếp từ `ReviewLog`.
 */
@Entity('LeagueEntry')
@Index('LeagueEntry_weekId_tier_idx', ['weekId', 'tier'])
@Index('LeagueEntry_weekId_userId_key', ['weekId', 'userId'], { unique: true })
export class LeagueEntry {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'LeagueEntry_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  weekId!: string;

  @ManyToOne(() => LeagueWeek, (x) => x.entries, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'weekId',
    foreignKeyConstraintName: 'LeagueEntry_weekId_fkey',
  })
  week!: LeagueWeek;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.leagueEntries, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'LeagueEntry_userId_fkey',
  })
  user!: User;

  /** chỉ số vào LEAGUE_TIERS (0 = thấp nhất) */
  @Column({ type: 'integer' })
  tier!: number;

  /** "up" | "down" | "stay" — chỉ set lúc rollover */
  @Column({ type: 'text', nullable: true })
  movement!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
