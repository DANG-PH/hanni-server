import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';

/**
 * Bài đọc AI viết cho 1 bài học (2026-10-19) — chỉ dùng từ của bài + chữ thuộc HSK ≤ cấp
 * bài; tạo 1 lần khi người học đầu tiên bấm rồi ai cũng đọc được (như `Word.mnemonicVi`).
 */
@Entity('LessonReading')
export class LessonReading {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'LessonReading_pkey',
  })
  lessonId!: string;

  @OneToOne(() => Lesson, (x) => x.reading, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'lessonId',
    foreignKeyConstraintName: 'LessonReading_lessonId_fkey',
  })
  lesson!: Lesson;

  @Column({ type: 'text' })
  title!: string;

  /** [{speaker: "A"|"B"|null, zh, pinyin, vi}] */
  @Column({ type: 'jsonb' })
  sentences!: unknown;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}
