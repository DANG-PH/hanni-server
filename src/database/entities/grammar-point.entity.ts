import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { arrayOrEmpty } from '../transformers';

/** Một điểm ngữ pháp HSK. Nội dung do Hanni soạn (dataset từ vựng không có). */
@Entity('GrammarPoint')
@Index('GrammarPoint_hskLevel_orderIndex_idx', ['hskLevel', 'orderIndex'])
@Index('GrammarPoint_slug_key', ['slug'], { unique: true })
export class GrammarPoint {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'GrammarPoint_pkey',
  })
  id!: string;

  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'integer' })
  hskLevel!: number;

  @Column({ type: 'integer', default: 0 })
  orderIndex!: number;

  /** "" */
  @Column({ type: 'text' })
  titleVi!: string;

  /** "" */
  @Column({ type: 'text' })
  titleZh!: string;

  /** 1–2 câu tóm tắt */
  @Column({ type: 'text' })
  summaryVi!: string;

  /** giải thích đầy đủ (xuống dòng bằng \n) */
  @Column({ type: 'text' })
  explanationVi!: string;

  /** ["", ...] */
  @Column({
    type: 'text',
    array: true,
    transformer: arrayOrEmpty,
    nullable: true,
  })
  patterns!: string[];

  /** [{ zh, pinyin, vi }] */
  @Column({ type: 'jsonb' })
  examples!: unknown;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  updatedAt!: Date;
}
