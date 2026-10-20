import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LeagueEntry } from './league-entry.entity';

/**
 * Giải đấu học tập theo TUẦN (`LeagueService`) — khác hẳn ELO đấu 1v1 ở
 * trên (đây xếp theo mức độ HỌC TẬP trong tuần, không phải thắng/thua khi
 * đấu). Reset mỗi tuần, tự thăng/giáng hạng — cơ chế giữ chân người dùng
 * mạnh nhất theo research (xem FEATURES.md), khác thẳng lên bảng xếp hạng
 * tĩnh vô tận hiện có ở `leaderboard.service.ts`.
 */
@Entity('LeagueWeek')
@Index('LeagueWeek_weekKey_key', ['weekKey'], { unique: true })
export class LeagueWeek {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'LeagueWeek_pkey',
  })
  id!: string;

  /**
   * khoá tuần tự tăng dạng "W123" (số tuần kể từ 1 mốc cố định, KHÔNG phải
   * số tuần ISO lịch — tránh phải xử lý các trường hợp biên qua năm) — xem
   * `currentWeekKey()` trong `league.util.ts`.
   */
  @Column({ type: 'text' })
  weekKey!: string;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  startedAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => LeagueEntry, (x) => x.week)
  entries!: LeagueEntry[];
}
