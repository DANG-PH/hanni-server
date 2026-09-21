import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WordPos, type Word } from '@prisma/client';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { WordQueryDto } from './dto/word-query.dto';
import { imageQueryFrom, searchCommonsImage } from './word-image.util';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy ảnh minh hoạ nếu chưa có sẵn — chỉ cho danh từ cụ thể (Wikimedia
   * Commons, miễn phí, không cần key). Không chặn caller lâu nếu lỗi/chậm. */
  private async attachImage<T extends Word>(word: T): Promise<T> {
    if (word.imageUrl) return word;
    if (!word.meaningEn || !word.pos.includes(WordPos.NOUN)) return word;
    const query = imageQueryFrom(word.meaningEn);
    if (!query) return word;
    const imageUrl = await searchCommonsImage(query);
    if (!imageUrl) return word;
    await this.prisma.word
      .update({ where: { id: word.id }, data: { imageUrl } })
      .catch(() => undefined);
    return { ...word, imageUrl };
  }

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
        // tìm bằng âm Hán Việt — vd gõ "học hiệu" ra được 学校 dù nghĩa
        // tiếng Việt hiển thị là "trường học" (không trùng chuỗi)
        { hanViet: { contains: q, mode: 'insensitive' } },
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
    return this.attachImage(word);
  }

  /** "Từ vựng hôm nay": chọn CỐ ĐỊNH theo ngày (giống nhau cho mọi user, đổi
   * lúc 0h UTC) — xoay vòng theo `frequencyRank` (chỉ từ phổ biến, có nghĩa)
   * để tránh rơi vào từ hiếm ít ai biết. Không lưu DB, tính trực tiếp mỗi lần
   * gọi nên luôn khớp ngày hiện tại kể cả khi có từ mới được thêm vào. */
  /** Thống kê công khai cho trang chủ (chưa đăng nhập) — "bạn đã biết trước
   * bao nhiêu từ nhờ âm Hán Việt", điểm khác biệt cốt lõi của Hanni. */
  async stats() {
    const [total, withHanViet] = await this.prisma.$transaction([
      this.prisma.word.count(),
      this.prisma.word.count({ where: { hanViet: { not: null } } }),
    ]);
    return { total, withHanViet };
  }

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
    return this.attachImage(word);
  }
}
