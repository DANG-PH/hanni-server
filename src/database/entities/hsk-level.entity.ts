import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { HskBand, SkillType } from '../enums';
import { arrayOrEmpty } from '../transformers';
import { Lesson } from './lesson.entity';
import { UserLevelProgress } from './user-level-progress.entity';
import { Word } from './word.entity';

/** Bảng tra tĩnh 9 cấp HSK. Lưu CẢ chỉ tiêu bản 2021 và bản 2025 để app đối chiếu. */
@Entity('HskLevel')
export class HskLevel {
  /** 1..9 */
  @PrimaryColumn({ type: 'integer', primaryKeyConstraintName: 'HskLevel_pkey' })
  level!: number;

  @Column({ type: 'enum', enum: HskBand, enumName: 'HskBand' })
  band!: HskBand;

  /** true cho 7,8,9 (thi chung) */
  @Column({ type: 'boolean', default: false })
  isSharedBand!: boolean;

  @Column({ type: 'text' })
  nameVi!: string;

  @Column({ type: 'integer' })
  newWords2021!: number;

  @Column({ type: 'integer' })
  cumulative2021!: number;

  @Column({ type: 'integer' })
  newWords2025!: number;

  @Column({ type: 'integer' })
  cumulative2025!: number;

  @Column({ type: 'integer', nullable: true })
  readingChars!: number | null;

  @Column({ type: 'integer', nullable: true })
  writingChars!: number | null;

  @Column({
    type: 'enum',
    enum: SkillType,
    enumName: 'SkillType',
    array: true,
    transformer: arrayOrEmpty,
    nullable: true,
  })
  skills!: SkillType[];

  @OneToMany(() => Word, (x) => x.level)
  words!: Word[];

  @OneToMany(() => Lesson, (x) => x.level)
  lessons!: Lesson[];

  @OneToMany(() => UserLevelProgress, (x) => x.level)
  levelProgress!: UserLevelProgress[];
}
