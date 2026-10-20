import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DuelSeasonResult } from './duel-season-result.entity';

/**
 * BẢNG CŨ — tính năng đấu 1v1 đã gỡ 2026-10-19, không code nào còn đọc/ghi; giữ để không mất dữ liệu.
 * 1 mùa xếp hạng ELO — reset hàng tháng (xem DuelSeasonService). Mùa ĐANG
 * diễn ra là dòng có `endedAt = null` (luôn chỉ có tối đa 1 dòng như vậy).
 */
@Entity('DuelSeason')
@Index('DuelSeason_number_key', ['number'], { unique: true })
export class DuelSeason {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'DuelSeason_pkey',
  })
  id!: string;

  /** khoá mùa dạng YYYYMM (vd 202609) — vừa unique vừa tự sắp thứ tự đúng */
  @Column({ type: 'integer' })
  number!: number;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  startedAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => DuelSeasonResult, (x) => x.season)
  results!: DuelSeasonResult[];
}
