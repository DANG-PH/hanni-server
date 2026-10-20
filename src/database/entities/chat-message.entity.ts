import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatRole } from '../enums';
import { ChatSession } from './chat-session.entity';

@Entity('ChatMessage')
@Index('ChatMessage_sessionId_createdAt_idx', ['sessionId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ChatMessage_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => ChatSession, (x) => x.messages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'sessionId',
    foreignKeyConstraintName: 'ChatMessage_sessionId_fkey',
  })
  session!: ChatSession;

  @Column({ type: 'enum', enum: ChatRole, enumName: 'ChatRole' })
  role!: ChatRole;

  @Column({ type: 'varchar', length: 4000 })
  text!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
