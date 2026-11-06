import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Việc phụ cần làm SAU khi 1 giao dịch ghi xong. Ghi cùng giao dịch với dữ liệu chính nên hoặc có cả 2, hoặc không có gì:
 * không còn cảnh lưu được bài thi mà mất cập nhật chuỗi ngày vì tiến trình chết giữa 2 lần ghi (DDIA ch. 11).
 */
@Entity('OutboxEvent')
@Index('OutboxEvent_pending_idx', ['createdAt'], {
  where: '"processedAt" IS NULL',
})
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'OutboxEvent_pkey',
  })
  id!: string;

  @Column({ type: 'text' })
  type!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  processedAt!: Date | null;
}
