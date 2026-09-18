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
    if (query.lessonId) where.lessonId = query.lessonId;
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
        orderBy: query.lessonId
          ? [{ lessonOrder: 'asc' }, { simplified: 'asc' }]
          : [{ frequencyRank: 'asc' }, { simplified: 'asc' }],
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

  /** "Từ vựng hôm nay": chọn CỐ ĐỊNH theo ngày (giống nhau cho mọi user, đổi
   * lúc 0h UTC) — xoay vòng theo `frequencyRank` (chỉ từ phổ biến, có nghĩa)
   * để tránh rơi vào từ hiếm ít ai biết. Không lưu DB, tính trực tiếp mỗi lần
   * gọi nên luôn khớp ngày hiện tại kể cả khi có từ mới được thêm vào. */
  async ofTheDay() {
    const where: Prisma.WordWhereInput = {
      meaningVi: { not: null },
      frequencyRank: { not: null },
    };
    const total = await this.prisma.word.count({ where });
    if (total === 0) throw new NotFoundException('Chưa có dữ liệu từ vựng');

    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const [word] = await this.prisma.word.findMany({
      where,
      orderBy: { frequencyRank: 'asc' },
      skip: dayIndex % total,
      take: 1,
      include: { examples: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!word) throw new NotFoundException('Chưa có dữ liệu từ vựng');
    return word;
  }
}
