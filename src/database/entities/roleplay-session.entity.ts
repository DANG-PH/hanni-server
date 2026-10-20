import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleplayMessage } from './roleplay-message.entity';
import { User } from './user.entity';

/**
 * Hội thoại LUYỆN NÓI theo tình huống với AI (đóng vai phục vụ/nhân viên
 * bán hàng...) — TÁCH RIÊNG khỏi ChatSession/ChatMessage (trợ lý hỏi-đáp
 * chung) dù cấu trúc giống hệt, vì đây là bài tập PHẢN XẠ đóng vai chứ
 * không phải hỏi-đáp, không nên trộn lẫn vào lịch sử chat trợ lý — xem
 * `src/modules/roleplay`.
 */
@Entity('RoleplaySession')
@Index('RoleplaySession_userId_updatedAt_idx', ['userId', 'updatedAt']) // DB: ("userId", "updatedAt" DESC)
export class RoleplaySession {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'RoleplaySession_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.roleplaySessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'RoleplaySession_userId_fkey',
  })
  user!: User;

  /** key trong ROLEPLAY_SCENARIOS (roleplay-scenarios.ts) */
  @Column({ type: 'text' })
  scenarioKey!: string;

  @OneToMany(() => RoleplayMessage, (x) => x.session)
  messages!: RoleplayMessage[];

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
