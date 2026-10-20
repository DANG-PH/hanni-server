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
import { RoleplaySession } from './roleplay-session.entity';

@Entity('RoleplayMessage')
@Index('RoleplayMessage_sessionId_createdAt_idx', ['sessionId', 'createdAt'])
export class RoleplayMessage {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'RoleplayMessage_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => RoleplaySession, (x) => x.messages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'sessionId',
    foreignKeyConstraintName: 'RoleplayMessage_sessionId_fkey',
  })
  session!: RoleplaySession;

  @Column({ type: 'enum', enum: ChatRole, enumName: 'ChatRole' })
  role!: ChatRole;

  @Column({ type: 'varchar', length: 2000 })
  text!: string;

  /**
   * Pinyin sinh sẵn cho tin nhắn của MODEL (giúp người học đọc ngay, không
   * cần bấm dịch riêng) — null cho tin nhắn USER (không cần).
   */
  @Column({ type: 'varchar', length: 2000, nullable: true })
  pinyin!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
