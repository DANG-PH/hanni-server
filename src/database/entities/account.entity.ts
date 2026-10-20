import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthProvider } from '../enums';
import { User } from './user.entity';

/** Danh tính OAuth (kiểu Auth.js). Mỗi provider + tài khoản ngoài = 1 dòng. */
@Entity('Account')
@Index(
  'Account_provider_providerAccountId_key',
  ['provider', 'providerAccountId'],
  { unique: true },
)
@Index('Account_userId_idx', ['userId'])
export class Account {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'Account_pkey' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.accounts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'Account_userId_fkey',
  })
  user!: User;

  @Column({ type: 'enum', enum: AuthProvider, enumName: 'AuthProvider' })
  provider!: AuthProvider;

  /** vd Google `sub` */
  @Column({ type: 'text' })
  providerAccountId!: string;

  @Column({ type: 'text', nullable: true })
  accessToken!: string | null;

  @Column({ type: 'text', nullable: true })
  refreshToken!: string | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  scope!: string | null;

  @Column({ type: 'text', nullable: true })
  idToken!: string | null;

  @Column({ type: 'text', nullable: true })
  tokenType!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
