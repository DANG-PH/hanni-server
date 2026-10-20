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
import { ChatMessage } from './chat-message.entity';
import { User } from './user.entity';

/**
 * 1 cuộc trò chuyện với trợ lý AI — user có thể có nhiều cuộc song song
 * (như ChatGPT/Claude). Tên tự đặt từ tin nhắn đầu tiên, không đổi lại sau
 * đó dù có nhắn thêm — xem AssistantService.ask().
 */
@Entity('ChatSession')
@Index('ChatSession_userId_updatedAt_idx', ['userId', 'updatedAt']) // DB: ("userId", "updatedAt" DESC)
export class ChatSession {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ChatSession_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.chatSessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'ChatSession_userId_fkey',
  })
  user!: User;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @OneToMany(() => ChatMessage, (x) => x.session)
  messages!: ChatMessage[];

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
