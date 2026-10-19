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

  /** Tab "Ngữ pháp" của ô tra từ điển: điểm CÓ giải thích thật mà tên, chữ Hán hay mẫu câu chứa từ
   * khoá (gõ 把, "so sánh", "vừa…vừa"). Mục đại cương rút gọn mở ra là ngõ cụt nên bỏ. */
  async search(raw: string) {
    const q = raw.trim().slice(0, 40);
    if (!q) return [];
    return this.prisma.grammarPoint.findMany({
      where: {
        explanationVi: { not: '' },
        OR: [
          { titleZh: { contains: q } },
          { titleVi: { contains: q, mode: 'insensitive' } },
          { summaryVi: { contains: q, mode: 'insensitive' } },
          { patterns: { has: q } },
        ],
      },
      orderBy: [{ hskLevel: 'asc' }, { orderIndex: 'asc' }],
      select: {
        slug: true,
        hskLevel: true,
        titleVi: true,
        titleZh: true,
        summaryVi: true,
      },
      take: 20,
    });
  }

  async get(slug: string) {
    const point = await this.prisma.grammarPoint.findUnique({
      where: { slug },
    });
    if (!point) throw new NotFoundException('Không tìm thấy điểm ngữ pháp');
    return point;
  }
}
