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

/** 1 user theo dõi 1 user khác (không cần theo dõi lại nhau — 1 chiều). */
@Entity('Follow')
@Index('Follow_followerId_followingId_key', ['followerId', 'followingId'], {
  unique: true,
})
@Index('Follow_followingId_idx', ['followingId'])
export class Follow {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'Follow_pkey' })
  id!: string;

  @Column({ type: 'uuid' })
  followerId!: string;

  @ManyToOne(() => User, (x) => x.following, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'followerId',
    foreignKeyConstraintName: 'Follow_followerId_fkey',
  })
  follower!: User;

  @Column({ type: 'uuid' })
  followingId!: string;

  @ManyToOne(() => User, (x) => x.followers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'followingId',
    foreignKeyConstraintName: 'Follow_followingId_fkey',
  })
  following!: User;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
