import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { User } from './user.entity';

/** Tiến độ theo từng Bài của user (dùng cho trang Lộ trình). */
@Entity('UserLessonProgress')
@Index('UserLessonProgress_userId_idx', ['userId'])
@Index('UserLessonProgress_userId_lessonId_key', ['userId', 'lessonId'], {
  unique: true,
})
export class UserLessonProgress {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'UserLessonProgress_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (x) => x.lessonProgress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'UserLessonProgress_userId_fkey',
  })
  user!: User;

  @Column({ type: 'uuid' })
  lessonId!: string;

  @ManyToOne(() => Lesson, (x) => x.lessonProgress, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'lessonId',
    foreignKeyConstraintName: 'UserLessonProgress_lessonId_fkey',
  })
  lesson!: Lesson;

  @Column({ type: 'integer', default: 0 })
  learnedWords!: number;

  @Column({ type: 'integer', default: 0 })
  totalWords!: number;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  completedAt!: Date | null;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
