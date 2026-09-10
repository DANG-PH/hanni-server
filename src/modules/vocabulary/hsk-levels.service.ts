import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class HskLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const [levels, counts] = await this.prisma.$transaction([
      this.prisma.hskLevel.findMany({ orderBy: { level: 'asc' } }),
      this.prisma.word.groupBy({
        by: ['hskLevel'],
        _count: true,
        orderBy: { hskLevel: 'asc' },
      }),
    ]);
    const countByLevel = new Map(counts.map((c) => [c.hskLevel, c._count]));
    return levels.map((l) => ({
      ...l,
      wordsInDb: countByLevel.get(l.level) ?? 0,
    }));
  }

  async get(level: number) {
    const row = await this.prisma.hskLevel.findUnique({ where: { level } });
    if (!row) throw new NotFoundException('Cấp HSK không hợp lệ');
    const wordsInDb = await this.prisma.word.count({ where: { hskLevel: level } });
    return { ...row, wordsInDb };
  }
}
