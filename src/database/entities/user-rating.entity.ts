import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * BẢNG CŨ — tính năng đấu 1v1 đã gỡ 2026-10-19, không code nào còn đọc/ghi; giữ để không mất dữ liệu.
 * Điểm ELO cho "Đấu 1v1" — Giai đoạn 2 minigame (xem FEATURES.md). CHƯA có
 * rank tier (Sắt→Thách Đấu)/mùa giải, chỉ 1 con số ELO thô để kiểm chứng
 * ghép trận + tính điểm hoạt động ổn trước khi thêm lớp rank ở giai đoạn 3.
 */
@Entity('UserRating')
@Index('UserRating_elo_idx', ['elo'])
export class UserRating {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'UserRating_pkey' })
  userId!: string;

  @OneToOne(() => User, (x) => x.rating, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserRating_userId_fkey',
  })
  user!: User;

  @Column({ type: 'integer', default: 1000 })
  elo!: number;

  @Column({ type: 'integer', default: 0 })
  wins!: number;

  @Column({ type: 'integer', default: 0 })
  losses!: number;

  @Column({ type: 'integer', default: 0 })
  draws!: number;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
