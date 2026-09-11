import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class GrammarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách điểm ngữ pháp, lọc theo cấp HSK nếu có. */
  async list(level?: number) {
    const points = await this.prisma.grammarPoint.findMany({
      where: level ? { hskLevel: level } : undefined,
      orderBy: [{ hskLevel: 'asc' }, { orderIndex: 'asc' }],
      select: {
        slug: true,
        hskLevel: true,
        titleVi: true,
        titleZh: true,
        summaryVi: true,
        explanationVi: true,
      },
    });
    // `flat` = mục đại cương (không có giải thích) → FE hiển thị gọn, không mở rộng.
    return points.map(({ explanationVi, ...p }) => ({
      ...p,
      flat: explanationVi.trim() === '',
    }));
  }

  /** Các cấp HSK đang có điểm ngữ pháp + số lượng mỗi cấp. */
  async levels() {
    const rows = await this.prisma.grammarPoint.groupBy({
      by: ['hskLevel'],
      _count: { _all: true },
      orderBy: { hskLevel: 'asc' },
    });
    return rows.map((r) => ({ level: r.hskLevel, count: r._count._all }));
  }

  async get(slug: string) {
    const point = await this.prisma.grammarPoint.findUnique({
      where: { slug },
    });
    if (!point) throw new NotFoundException('Không tìm thấy điểm ngữ pháp');
    return point;
  }
}
