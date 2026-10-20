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

/** Refresh token của Hanni — xoay vòng, chỉ lưu HASH. Phát hiện reuse theo familyId. */
@Entity('RefreshToken')
@Index('RefreshToken_familyId_idx', ['familyId'])
@Index('RefreshToken_tokenHash_key', ['tokenHash'], { unique: true })
@Index('RefreshToken_userId_idx', ['userId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'RefreshToken_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.refreshTokens, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'RefreshToken_userId_fkey',
  })
  user!: User;

  @Column({ type: 'text' })
  tokenHash!: string;

  @Column({ type: 'uuid' })
  familyId!: string;

  @Column({ type: 'timestamp', precision: 3 })
  expiresAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  replacedById!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  ip!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
