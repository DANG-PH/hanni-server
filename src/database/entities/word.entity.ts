import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TranslationStatus, WordPos } from '../enums';
import { arrayOrEmpty } from '../transformers';
import { HskLevel } from './hsk-level.entity';
import { Lesson } from './lesson.entity';
import { PracticeAttempt } from './practice-attempt.entity';
import { UserWordProgress } from './user-word-progress.entity';
import { WordExample } from './word-example.entity';

@Entity('Word')
@Index('Word_hskLevel_frequencyRank_idx', ['hskLevel', 'frequencyRank'])
@Index('Word_lessonId_lessonOrder_idx', ['lessonId', 'lessonOrder'])
@Index('Word_needsReview_idx', ['needsReview'])
@Index('Word_simplified_pinyinNumeric_key', ['simplified', 'pinyinNumeric'], {
  unique: true,
})
export class Word {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'Word_pkey' })
  id!: string;

  @Column({ type: 'text' })
  simplified!: string;

  @Column({ type: 'text', nullable: true })
  traditional!: string | null;

  /** pinyin có dấu thanh (vd "nǐ hǎo") */
  @Column({ type: 'text' })
  pinyin!: string;

  /** pinyin dạng số (vd "ni3 hao3") — khóa join dataset + tìm kiếm không dấu */
  @Column({ type: 'text' })
  pinyinNumeric!: string;

  @Column({ type: 'integer' })
  hskLevel!: number;

  @ManyToOne(() => HskLevel, (x) => x.words, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'hskLevel',
    referencedColumnName: 'level',
    foreignKeyConstraintName: 'Word_hskLevel_fkey',
  })
  level!: HskLevel;

  /** true khi nguồn chỉ phân loại "7-9" chứ không tách 7/8/9 */
  @Column({ type: 'boolean', default: false })
  hskBandOnly!: boolean;

  @Column({
    type: 'enum',
    enum: WordPos,
    enumName: 'WordPos',
    array: true,
    transformer: arrayOrEmpty,
    nullable: true,
  })
  pos!: WordPos[];

  @Column({ type: 'integer', nullable: true })
  frequencyRank!: number | null;

  @Column({ type: 'text', nullable: true })
  radical!: string | null;

  @Column({ type: 'integer', nullable: true })
  strokeCount!: number | null;

  @Column({ type: 'text', nullable: true })
  meaningVi!: string | null;

  @Column({ type: 'text', nullable: true })
  meaningEn!: string | null;

  /**
   * âm Hán Việt (vd 學生 -> "học sinh") — null nếu thiếu âm cho bất kỳ ký tự
   * nào trong từ (xem scripts/import/lib/hanviet.ts)
   */
  @Column({ type: 'text', nullable: true })
  hanViet!: string | null;

  @Column({
    type: 'enum',
    enum: TranslationStatus,
    enumName: 'TranslationStatus',
    default: 'MISSING',
  })
  translationStatus!: TranslationStatus;

  @Column({ type: 'boolean', default: true })
  needsReview!: boolean;

  /** /media/audio/cmn-<hán tự>.mp3 (phục vụ tĩnh) */
  @Column({ type: 'text', nullable: true })
  audioUrl!: string | null;

  /**
   * mẹo nhớ theo âm Hán Việt do AI viết — tạo 1 lần khi có người bấm "Tạo mẹo
   * nhớ" rồi dùng chung cho mọi người (xem src/modules/ai-tools)
   */
  @Column({ type: 'text', nullable: true })
  mnemonicVi!: string | null;

  /**
   * Lượng từ đúng cách đọc, dạng "本|ben3" (từ chú thích LT: của CVDICT) — mục "Lượng từ" ở trang từ điển.
   */
  @Column({
    type: 'text',
    array: true,
    transformer: arrayOrEmpty,
    nullable: true,
    default: () => "'{}'",
  })
  measureWords!: string[];

  /** provenance: nguồn gốc dữ liệu */
  @Column({ type: 'text', nullable: true })
  source!: string | null;

  /** bài học chứa từ này (lộ trình tuyến tính theo cấp) */
  @Column({ type: 'uuid', nullable: true })
  lessonId!: string | null;

  @ManyToOne(() => Lesson, (x) => x.words, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'lessonId',
    foreignKeyConstraintName: 'Word_lessonId_fkey',
  })
  lesson!: Lesson | null;

  /** thứ tự trong bài */
  @Column({ type: 'integer', nullable: true })
  lessonOrder!: number | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;

  @OneToMany(() => WordExample, (x) => x.word)
  examples!: WordExample[];

  @OneToMany(() => UserWordProgress, (x) => x.word)
  progress!: UserWordProgress[];

  @OneToMany(() => PracticeAttempt, (x) => x.word)
  practiceAttempts!: PracticeAttempt[];
}
