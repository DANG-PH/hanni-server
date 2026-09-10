import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { WordQueryDto } from './dto/word-query.dto';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: WordQueryDto): Promise<Paginated<unknown>> {
    const where: Prisma.WordWhereInput = {};
    if (query.level) where.hskLevel = query.level;
    if (query.needsReview === 'true') where.needsReview = true;
    if (query.needsReview === 'false') where.needsReview = false;
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { simplified: { contains: q } },
        { traditional: { contains: q } },
        { pinyinNumeric: { contains: q.toLowerCase() } },
        { pinyin: { contains: q } },
        { meaningVi: { contains: q, mode: 'insensitive' } },
        { meaningEn: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.word.findMany({
        where,
        orderBy: [{ frequencyRank: 'asc' }, { simplified: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.word.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  async get(id: string) {
    const word = await this.prisma.word.findUnique({
      where: { id },
      include: { examples: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!word) throw new NotFoundException('Không tìm thấy từ');
    return word;
  }
}
