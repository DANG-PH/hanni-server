import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HskLevel, Word } from '../../database/entities';

@Injectable()
export class HskLevelsService {
  constructor(
    @InjectRepository(HskLevel) private readonly levels: Repository<HskLevel>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
  ) {}

  async list() {
    const [levels, counts] = await Promise.all([
      this.levels.find({ order: { level: 'ASC' } }),
      this.words
        .createQueryBuilder('word')
        .select('word.hskLevel', 'hskLevel')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('word.hskLevel')
        .getRawMany<{ hskLevel: number; count: number }>(),
    ]);
    const countByLevel = new Map(counts.map((c) => [c.hskLevel, c.count]));
    return levels.map((l) => ({
      ...l,
      wordsInDb: countByLevel.get(l.level) ?? 0,
    }));
  }
}
