import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassAssignmentKind } from '../enums';
import { Classroom } from './classroom.entity';
import { Lesson } from './lesson.entity';

/**
 * Bài giáo viên giao: 1 bài học (xong khi `UserLessonProgress.completedAt` có) hoặc 1 đề
 * thi thử (xong khi có `MockExamAttempt` của đề đó sau lúc giao) — không lưu trạng thái riêng.
 */
@Entity('ClassAssignment')
@Index('ClassAssignment_classroomId_createdAt_idx', [
  'classroomId',
  'createdAt',
])
export class ClassAssignment {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ClassAssignment_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  classroomId!: string;

  @ManyToOne(() => Classroom, (x) => x.assignments, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'classroomId',
    foreignKeyConstraintName: 'ClassAssignment_classroomId_fkey',
  })
  classroom!: Classroom;

  @Column({
    type: 'enum',
    enum: ClassAssignmentKind,
    enumName: 'ClassAssignmentKind',
  })
  kind!: ClassAssignmentKind;

  @Column({ type: 'uuid', nullable: true })
  lessonId!: string | null;

  @ManyToOne(() => Lesson, (x) => x.assignments, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'lessonId',
    foreignKeyConstraintName: 'ClassAssignment_lessonId_fkey',
  })
  lesson!: Lesson | null;

  @Column({ type: 'text', nullable: true })
  examSlug!: string | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  dueAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
