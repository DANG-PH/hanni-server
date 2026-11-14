import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Báo cáo của người dùng (2026-11-14, điều kiện lên CH Play): nội dung AI xúc phạm hoặc sai, người dùng có tên/ảnh
 * không phù hợp, yêu cầu xoá tài khoản gửi từ web khi không đăng nhập được. Admin đọc qua `GET /reports`.
 * Xoá tài khoản thì `userId` về null (khoá ngoại ON DELETE SET NULL) — báo cáo còn lại không gắn với ai.
 */
@Entity('ContentReport')
@Index('ContentReport_createdAt_idx', ['createdAt'])
export class ContentReport {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ContentReport_pkey',
  })
  id!: string;

  /** ai | user | account-deletion */
  @Column({ type: 'text' })
  kind!: string;

  /** offensive | sexual | dangerous | wrong | other | account-deletion */
  @Column({ type: 'text' })
  reason!: string;

  /** Tính năng AI nơi có nội dung bị báo cáo: assistant, roleplay, analyze, sentence-check, mnemonic, coach. */
  @Column({ type: 'text', nullable: true })
  feature!: string | null;

  /** Mã phiên trò chuyện, mã từ, mã người dùng bị báo cáo… */
  @Column({ type: 'text', nullable: true })
  targetId!: string | null;

  /** Bản chép nội dung bị báo cáo (tối đa 4.000 ký tự) — nội dung AI không lưu sẵn ở đâu khác. */
  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text' })
  note!: string;

  /** Email tài khoản cần xoá — chỉ có ở yêu cầu xoá tài khoản gửi khi chưa đăng nhập. */
  @Column({ type: 'text', nullable: true })
  contact!: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  /** open | done — admin đổi tay sau khi xử lý. */
  @Column({ type: 'text', default: 'open' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
