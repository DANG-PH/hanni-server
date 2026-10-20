import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Word } from './word.entity';

@Entity('WordExample')
@Index('WordExample_wordId_idx', ['wordId'])
export class WordExample {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'WordExample_pkey',
  })
  id!: string;

  @Column({ type: 'uuid' })
  wordId!: string;

  @ManyToOne(() => Word, (x) => x.examples, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'wordId',
    foreignKeyConstraintName: 'WordExample_wordId_fkey',
  })
  word!: Word;

  @Column({ type: 'text' })
  zh!: string;

  @Column({ type: 'text', nullable: true })
  pinyin!: string | null;

  @Column({ type: 'text', nullable: true })
  vi!: string | null;

  @Column({ type: 'text', nullable: true })
  en!: string | null;

  @Column({ type: 'text', nullable: true })
  audioUrl!: string | null;

  @Column({ type: 'integer', default: 0 })
  orderIndex!: number;

  @Column({ type: 'text', nullable: true })
  source!: string | null;
}
