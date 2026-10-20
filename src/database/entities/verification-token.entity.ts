import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VerificationTokenType } from '../enums';

/** Token xác minh email + reset mật khẩu. Chỉ lưu HASH. */
@Entity('VerificationToken')
@Index('VerificationToken_identifier_idx', ['identifier'])
@Index('VerificationToken_tokenHash_key', ['tokenHash'], { unique: true })
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'VerificationToken_pkey',
  })
  id!: string;

  /** email */
  @Column({ type: 'text' })
  identifier!: string;

  @Column({ type: 'text' })
  tokenHash!: string;

  @Column({
    type: 'enum',
    enum: VerificationTokenType,
    enumName: 'VerificationTokenType',
  })
  type!: VerificationTokenType;

  @Column({ type: 'timestamp', precision: 3 })
  expiresAt!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
