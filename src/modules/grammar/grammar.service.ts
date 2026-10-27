import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, ILike, Like, Not, Repository } from 'typeorm';
import { GrammarPoint } from '../../database/entities';
import { likeEscape } from '../../database/repository.util';

@Injectable()
export class GrammarService {
  constructor(
    @InjectRepository(GrammarPoint)
    private readonly points: Repository<GrammarPoint>,
  ) {}

  /** Danh sách điểm ngữ pháp, lọc theo cấp HSK nếu có. */
  async list(level?: number) {
    const points = await this.points.find({
      where: level ? { hskLevel: level } : {},
      order: { hskLevel: 'ASC', orderIndex: 'ASC' },
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

  /** Tab "Ngữ pháp" của ô tra từ điển: điểm CÓ giải thích thật mà tên, chữ Hán hay mẫu câu chứa từ
   * khoá (gõ 把, "so sánh", "vừa…vừa"). Mục đại cương rút gọn mở ra là ngõ cụt nên bỏ. */
  async search(raw: string) {
    const q = raw.trim().slice(0, 40);
    if (!q) return [];
    const like = `%${likeEscape(q)}%`;
    const explained = { explanationVi: Not('') };
    return this.points.find({
      // Mảng where = HOẶC: khớp tên chữ Hán, tên tiếng Việt, tóm tắt hoặc một mẫu câu.
      where: [
        { ...explained, titleZh: Like(like) },
        { ...explained, titleVi: ILike(like) },
        { ...explained, summaryVi: ILike(like) },
        { ...explained, patterns: ArrayContains([q]) },
      ],
      order: { hskLevel: 'ASC', orderIndex: 'ASC' },
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
    const point = await this.points.findOneBy({ slug });
    if (!point) throw new NotFoundException('Không tìm thấy điểm ngữ pháp');
    return point;
  }
}
