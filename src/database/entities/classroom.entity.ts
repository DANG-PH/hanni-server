import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassAssignment } from './class-assignment.entity';
import { ClassroomMember } from './classroom-member.entity';
import { User } from './user.entity';

/**
 * Lớp học (2026-10-19): giáo viên/trung tâm tạo lớp, học viên vào bằng mã, giáo viên xem
 * tiến độ từng người + giao bài (bài học hoặc đề thi thử). Học viên vào lớp là đồng ý cho
 * giáo viên xem tiến độ học của mình; rời lớp là hết.
 */
@Entity('Classroom')
@Index('Classroom_code_key', ['code'], { unique: true })
@Index('Classroom_ownerId_idx', ['ownerId'])
export class Classroom {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'Classroom_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (x) => x.classroomsOwned, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'ownerId',
    foreignKeyConstraintName: 'Classroom_ownerId_fkey',
  })
  owner!: User;

  @Column({ type: 'text' })
  name!: string;

  /** Mã vào lớp 6 ký tự, không có chữ dễ nhầm (0/O, 1/I/L) */
  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'integer', nullable: true })
  hskLevel!: number | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @OneToMany(() => ClassroomMember, (x) => x.classroom)
  members!: ClassroomMember[];

  @OneToMany(() => ClassAssignment, (x) => x.classroom)
  assignments!: ClassAssignment[];
}
