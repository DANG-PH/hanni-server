import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DuelSeason } from './duel-season.entity';
import { User } from './user.entity';

/**
 * BẢNG CŨ — tính năng đấu 1v1 đã gỡ 2026-10-19, không code nào còn đọc/ghi; giữ để không mất dữ liệu.
 * Kết quả 1 người chơi khi kết thúc mùa — chụp lại hạng/tier/ELO cuối mùa
 * TRƯỚC khi ELO bị giảm nhẹ (soft reset) cho mùa mới, để còn tra lại lịch
 * sử mùa trước dù ELO hiện tại đã đổi khác.
 */
@Entity('DuelSeasonResult')
@Index('DuelSeasonResult_seasonId_userId_key', ['seasonId', 'userId'], {
  unique: true,
})
@Index('DuelSeasonResult_userId_idx', ['userId'])
export class DuelSeasonResult {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'DuelSeasonResult_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  seasonId!: string;

  @ManyToOne(() => DuelSeason, (x) => x.results, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'seasonId',
    foreignKeyConstraintName: 'DuelSeasonResult_seasonId_fkey',
  })
  season!: DuelSeason;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.duelSeasonResults, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'DuelSeasonResult_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer' })
  finalElo!: number;

  @Column({ type: 'text' })
  tier!: string;

  @Column({ type: 'integer' })
  rank!: number;

  @Column({ type: 'integer' })
  wins!: number;

  @Column({ type: 'integer' })
  losses!: number;

  @Column({ type: 'integer' })
  draws!: number;

  @Column({ type: 'integer' })
  coinsAwarded!: number;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
