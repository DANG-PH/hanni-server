import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('DirectMessage')
@Index('DirectMessage_conversationId_createdAt_idx', [
  'conversationId',
  'createdAt',
])
export class DirectMessage {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'DirectMessage_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => Conversation, (x) => x.messages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'conversationId',
    foreignKeyConstraintName: 'DirectMessage_conversationId_fkey',
  })
  conversation!: Conversation;

  @Column({ type: 'uuid' })
  senderId!: string;

  @ManyToOne(() => User, (x) => x.sentDirectMessages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'senderId',
    foreignKeyConstraintName: 'DirectMessage_senderId_fkey',
  })
  sender!: User;

  @Column({ type: 'varchar', length: 2000 })
  content!: string;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
