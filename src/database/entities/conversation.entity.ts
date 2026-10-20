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
import { DirectMessage } from './direct-message.entity';
import { User } from './user.entity';

/**
 * Nhắn tin trực tiếp 1-1 — 1 cặp user chỉ có ĐÚNG 1 cuộc hội thoại
 * (userAId LUÔN là id nhỏ hơn theo thứ tự chuỗi, userBId lớn hơn — chuẩn
 * hoá ở tầng service trước khi ghi/đọc để tránh tạo trùng 2 hội thoại cho
 * cùng 1 cặp tuỳ ai nhắn trước).
 */
@Entity('Conversation')
@Index('Conversation_userAId_userBId_key', ['userAId', 'userBId'], {
  unique: true,
})
@Index('Conversation_userBId_idx', ['userBId'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'Conversation_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userAId!: string;

  @ManyToOne(() => User, (x) => x.conversationsAsA, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userAId',
    foreignKeyConstraintName: 'Conversation_userAId_fkey',
  })
  userA!: User;

  @Column({ type: 'uuid' })
  userBId!: string;

  @ManyToOne(() => User, (x) => x.conversationsAsB, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userBId',
    foreignKeyConstraintName: 'Conversation_userBId_fkey',
  })
  userB!: User;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  /** Cập nhật mỗi khi có tin nhắn mới — dùng để sắp hộp thư theo hoạt động gần nhất. */
  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToMany(() => DirectMessage, (x) => x.conversation)
  messages!: DirectMessage[];
}
