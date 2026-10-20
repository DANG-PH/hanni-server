import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Classroom } from './classroom.entity';
import { User } from './user.entity';

@Entity('ClassroomMember')
@Index('ClassroomMember_userId_idx', ['userId'])
export class ClassroomMember {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'ClassroomMember_pkey',
  })
  classroomId!: string;

  @ManyToOne(() => Classroom, (x) => x.members, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'classroomId',
    foreignKeyConstraintName: 'ClassroomMember_classroomId_fkey',
  })
  classroom!: Classroom;

  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'ClassroomMember_pkey',
  })
  userId!: string;

  @ManyToOne(() => User, (x) => x.classroomMembers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'ClassroomMember_userId_fkey',
  })
  user!: User;

  @Column({ type: 'timestamp', precision: 3, default: () => 'now()' })
  joinedAt!: Date;
}
