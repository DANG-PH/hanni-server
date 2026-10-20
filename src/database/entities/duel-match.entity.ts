import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * BẢNG CŨ — tính năng đấu 1v1 đã gỡ 2026-10-19, không code nào còn đọc/ghi; giữ để không mất dữ liệu.
 * Lịch sử 1 trận đấu đơn — lưu lại kết quả + biến động ELO của cả 2 bên để
 * tra cứu/đối soát (không lưu chi tiết từng câu, chỉ tổng điểm).
 */
@Entity('DuelMatch')
@Index('DuelMatch_playerAId_idx', ['playerAId'])
@Index('DuelMatch_playerBId_idx', ['playerBId'])
export class DuelMatch {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'DuelMatch_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  playerAId!: string;

  @ManyToOne(() => User, (x) => x.duelsAsA, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'playerAId',
    foreignKeyConstraintName: 'DuelMatch_playerAId_fkey',
  })
  playerA!: User;

  @Column({ type: 'uuid' })
  playerBId!: string;

  @ManyToOne(() => User, (x) => x.duelsAsB, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'playerBId',
    foreignKeyConstraintName: 'DuelMatch_playerBId_fkey',
  })
  playerB!: User;

  @Column({ type: 'integer' })
  scoreA!: number;

  @Column({ type: 'integer' })
  scoreB!: number;

  @Column({ type: 'uuid', nullable: true })
  winnerId!: string | null;

  /**
   * khác null nếu trận kết thúc do 1 bên rớt mạng quá lâu (forfeit) thay vì
   * đấu hết vòng — bằng playerAId hoặc playerBId, KHÔNG có quan hệ FK riêng
   * vì đã trùng 1 trong 2 cột trên (chỉ để hiển thị lý do kết thúc).
   */
  @Column({ type: 'uuid', nullable: true })
  forfeitedUserId!: string | null;

  @Column({ type: 'integer' })
  eloChangeA!: number;

  @Column({ type: 'integer' })
  eloChangeB!: number;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
