import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { HskBand } from '../enums';
import { Lesson } from './lesson.entity';
import { UserLevelProgress } from './user-level-progress.entity';
import { Word } from './word.entity';

/** Bảng tra tĩnh 9 cấp HSK theo đại cương 11/2025 (số liệu: database/seed/hsk-levels.ts). */
@Entity('HskLevel')
export class HskLevel {
  /** 1..9 */
  @PrimaryColumn({ type: 'integer', primaryKeyConstraintName: 'HskLevel_pkey' })
  level!: number;

  @Column({ type: 'enum', enum: HskBand, enumName: 'HskBand' })
  band!: HskBand;

  @Column({ type: 'text' })
  nameVi!: string;

  @Column({ type: 'integer' })
  newWords2025!: number;

  @Column({ type: 'integer' })
  cumulative2025!: number;

  @Column({ type: 'integer', nullable: true })
  readingChars!: number | null;

  @Column({ type: 'integer', nullable: true })
  writingChars!: number | null;

  @OneToMany(() => Word, (x) => x.level)
  words!: Word[];

  @OneToMany(() => Lesson, (x) => x.level)
  lessons!: Lesson[];

  @OneToMany(() => UserLevelProgress, (x) => x.level)
  levelProgress!: UserLevelProgress[];
}
