import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassAssignment } from './class-assignment.entity';
import { HskLevel } from './hsk-level.entity';
import { LessonReading } from './lesson-reading.entity';
import { UserLessonProgress } from './user-lesson-progress.entity';
import { Word } from './word.entity';

/**
 * Bài học — chia nhỏ từ vựng mỗi cấp HSK thành lộ trình tuyến tính (~15 từ/bài),
 * sắp theo tần suất. Seed tĩnh từ words.seed.json.
 */
@Entity('Lesson')
@Index('Lesson_hskLevel_idx', ['hskLevel'])
@Index('Lesson_hskLevel_orderIndex_key', ['hskLevel', 'orderIndex'], {
  unique: true,
})
export class Lesson {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'Lesson_pkey' })
  id!: string;

  @Column({ type: 'integer' })
  hskLevel!: number;

  @ManyToOne(() => HskLevel, (x) => x.lessons, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'hskLevel',
    referencedColumnName: 'level',
    foreignKeyConstraintName: 'Lesson_hskLevel_fkey',
  })
  level!: HskLevel;

  /** 1..N trong cấp */
  @Column({ type: 'integer' })
  orderIndex!: number;

  /** vd "" */
  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'integer', default: 0 })
  wordCount!: number;

  @OneToMany(() => Word, (x) => x.lesson)
  words!: Word[];

  @OneToMany(() => UserLessonProgress, (x) => x.lesson)
  lessonProgress!: UserLessonProgress[];

  @OneToOne(() => LessonReading, (x) => x.lesson)
  reading!: LessonReading | null;

  @OneToMany(() => ClassAssignment, (x) => x.lesson)
  assignments!: ClassAssignment[];
}
