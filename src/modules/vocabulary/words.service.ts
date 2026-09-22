import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WordPos, type Word } from '@prisma/client';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { WordQueryDto } from './dto/word-query.dto';
import {
  imageQueryFrom,
  searchCommonsImage,
  searchWikipediaImage,
} from './word-image.util';

/** Cấp HSK cao nhất còn tự lấy ảnh minh hoạ — xem lý do ở `attachImage()`. */
const IMAGE_MAX_HSK_LEVEL = 5;

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy ảnh minh hoạ nếu chưa có sẵn — chỉ cho danh từ cụ thể (Wikimedia
   * Commons, miễn phí, không cần key). Không chặn caller lâu nếu lỗi/chậm. */
  private async attachImage<T extends Word>(word: T): Promise<T> {
    if (word.imageUrl) return word;
    if (!word.pos.includes(WordPos.NOUN)) return word;
    // CHỈ lấy ảnh tới HSK5. Đo thật 2026-09-22 trên 15 danh từ HSK6 lấy thử:
    // khoảng MỘT NỬA ra ảnh sai lệch hẳn nghĩa — 真相 (sự thật) ra que diêm,
    // 著作 (viết) ra cái đầm phá, 线索 (manh mối) ra sân điền kinh. Lý do: từ
    // càng lên cao càng TRỪU TƯỢNG, mà ảnh lấy từ ảnh đại diện bài Wikipedia
    // của chính Hán tự đó — với vật thể cụ thể thì đúng (HSK1-5: 1.650/1.662
    // danh từ có ảnh, kiểm tra tay thấy chuẩn), với khái niệm trừu tượng thì
    // gần như tuỳ hứng. Gắn ảnh sai vào một từ là DẠY SAI liên tưởng, hại hơn
    // là không có ảnh — cùng nguyên tắc "thà thiếu còn hơn sai" đã áp dụng
    // cho âm Hán Việt và cho việc KHÔNG trích câu thoại video làm ví dụ.
    if (word.hskLevel > IMAGE_MAX_HSK_LEVEL) return word;
    // Wikipedia tiếng Trung TRƯỚC (tra theo chính Hán tự nên không phải đoán
    // nghĩa), Commons chỉ là dự phòng — xem searchWikipediaImage().
    const query = word.meaningEn ? imageQueryFrom(word.meaningEn) : null;
    const imageUrl =
      (await searchWikipediaImage(word.simplified)) ??
      (query ? await searchCommonsImage(query) : null);
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

  /** Thống kê công khai cho trang chủ (chưa đăng nhập) — "bạn đã biết trước
   * bao nhiêu từ nhờ âm Hán Việt", điểm khác biệt cốt lõi của Hanni. */
  async stats() {
    const [total, withHanViet] = await this.prisma.$transaction([
      this.prisma.word.count(),
      this.prisma.word.count({ where: { hanViet: { not: null } } }),
    ]);
    return { total, withHanViet };
  }

  /** Tra từ CÔNG KHAI theo Hán tự (không cần đăng nhập) — phục vụ trang từ
   * điển `/tu-dien/[từ]` ở client, mục đích chính là SEO: mỗi từ là 1 trang
   * Google index được, nhắm đúng truy vấn người Việt hay tìm ("学生 nghĩa là
   * gì", "âm Hán Việt của 时间"). Trước đây toàn bộ 10.9k từ nằm sau đăng
   * nhập nên hoàn toàn vô hình với công cụ tìm kiếm.
   *
   * Trả về MẢNG vì 1 Hán tự có thể ứng với nhiều mục từ khác pinyin (đa âm).
   * KHÔNG gọi attachImage() — trang công khai có thể bị bot quét hàng loạt,
   * không nên kéo theo hàng nghìn request sang Wikimedia. */
  async lookup(slug: string) {
    const words = await this.prisma.word.findMany({
      where: { simplified: slug },
      include: { examples: { orderBy: { orderIndex: 'asc' } } },
      orderBy: [{ frequencyRank: 'asc' }, { hskLevel: 'asc' }],
    });
    if (words.length === 0) throw new NotFoundException('Không tìm thấy từ');

    // Vài từ cùng cấp để người đọc (và bot) có đường đi tiếp sang trang khác.
    const related = await this.prisma.word.findMany({
      where: {
        hskLevel: words[0].hskLevel,
        simplified: { not: slug },
        meaningVi: { not: null },
      },
      select: { simplified: true, pinyin: true, meaningVi: true },
      orderBy: { frequencyRank: 'asc' },
      take: 12,
    });

    const [characters, compounds, videos] = await Promise.all([
      this.breakDownCharacters(words[0]),
      this.compoundsContaining(slug),
      this.videosUsingWord(slug),
    ]);
    return { words, related, characters, compounds, videos };
  }

  /** Video có lời thoại chứa từ này — để người học nghe nó trong ngữ cảnh
   * thật thay vì chỉ đọc nghĩa.
   *
   * CỐ TÌNH chỉ trả tên video + số lần xuất hiện, KHÔNG trích câu thoại ra
   * làm "câu ví dụ". Đã thử hướng đó và bỏ: video Hanni chủ yếu là phim tu
   * tiên/ngôn tình, phụ đề dịch bằng MÁY, nên trích ra được những câu kiểu
   * 等我用剑一草突破回去就是你的死期 → "Khi tôi sử dụng kiếm và cỏ đột phá,
   * bạn sẽ ch…" (sai + cụt) hoặc từ vựng tu tiên vô dụng với người học HSK.
   * Dạy sai còn hại hơn thiếu, và Google cũng đánh giá thấp nội dung kiểu đó.
   * Đưa người học sang xem cả đoạn video thì ngữ cảnh đầy đủ và có giọng
   * thật — an toàn hơn hẳn mà vẫn nối được từ vựng với video. */
  private async videosUsingWord(slug: string) {
    const rows = await this.prisma.videoLine.groupBy({
      by: ['videoId'],
      where: { zh: { contains: slug } },
      _count: { _all: true },
      orderBy: { _count: { videoId: 'desc' } },
      take: 3,
    });
    if (rows.length === 0) return [];
    const videos = await this.prisma.video.findMany({
      where: { id: { in: rows.map((r) => r.videoId) } },
      select: { id: true, title: true, thumbnailUrl: true, hskLevel: true },
    });
    const countById = new Map(rows.map((r) => [r.videoId, r._count._all]));
    return videos
      .map((v) => ({ ...v, lineCount: countById.get(v.id) ?? 0 }))
      .sort((a, b) => b.lineCount - a.lineCount);
  }

  /** Tách từ ghép thành từng chữ kèm âm Hán Việt + nghĩa của riêng chữ đó.
   *
   * Đây là chỗ khai thác SÂU nhất lợi thế Hán Việt: 电脑 = 电 (điện) + 脑
   * (não) → người Việt đọc "điện não" là đoán ra máy tính ngay, không cần
   * học thuộc. Research sư phạm tiếng Trung (Hacking Chinese, YoyoChinese)
   * đều xác nhận học theo thành phần hiệu quả hơn nhiều so với học từng từ
   * rời rạc — "biết các từ chứa một chữ thì đoán được nghĩa từ mới chứa chữ
   * đó". Với người Việt, mỗi thành phần lại có sẵn một âm quen thuộc.
   *
   * `hanViet` lưu dạng "điện não" (các âm cách nhau bởi khoảng trắng, sinh
   * theo THỨ TỰ ký tự) nên tách theo khoảng trắng là khớp 1-1 với từng chữ.
   * Nghĩa riêng của chữ lấy từ chính bảng Word nếu chữ đó tồn tại như một
   * mục từ đơn (1.519 từ 1 chữ). */
  private async breakDownCharacters(word: Word) {
    const chars = Array.from(word.simplified);
    if (chars.length < 2) return [];
    const readings = word.hanViet ? word.hanViet.split(/\s+/) : [];
    // Chỉ dùng khi số âm khớp số chữ — lệch thì thà bỏ còn hơn gán sai âm.
    const aligned = readings.length === chars.length;

    const singles = await this.prisma.word.findMany({
      where: { simplified: { in: chars }, meaningVi: { not: null } },
      select: { simplified: true, pinyin: true, meaningVi: true },
      orderBy: { frequencyRank: 'asc' },
    });
    const byChar = new Map<string, (typeof singles)[number]>();
    for (const s of singles)
      if (!byChar.has(s.simplified)) byChar.set(s.simplified, s);

    return chars.map((char, i) => ({
      char,
      hanViet: aligned ? readings[i] : null,
      pinyin: byChar.get(char)?.pinyin ?? null,
      meaningVi: byChar.get(char)?.meaningVi ?? null,
    }));
  }

  /** Từ ghép KHÁC cũng chứa chữ này — vừa là cách học theo cụm (thấy 电 lặp
   * lại ở 电话/电视 thì nhớ "điện" chắc hơn), vừa tạo liên kết nội bộ dày
   * giữa các trang từ điển, giúp bot bò sâu vào site. */
  private async compoundsContaining(slug: string) {
    const chars = Array.from(slug);
    // Từ 1 chữ: tìm từ ghép chứa nó. Từ ghép: lấy theo chữ ĐẦU (đại diện đủ
    // tốt, tránh truy vấn OR dài dòng cho từ 3-4 chữ).
    const key = chars[0];
    return this.prisma.word.findMany({
      where: {
        simplified: { contains: key, not: slug },
        meaningVi: { not: null },
        hanViet: { not: null },
      },
      select: {
        simplified: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
      },
      orderBy: { frequencyRank: 'asc' },
      take: 10,
    });
  }

  /** Những từ mà âm Hán Việt TRÙNG KHỚP luôn với nghĩa tiếng Việt — tức là
   * người Việt đã biết sẵn mà không hay biết (电话 = "điện thoại", 世界 =
   * "thế giới", 机会 = "cơ hội"...).
   *
   * Đây là tài sản nội dung ĐỘC NHẤT của Hanni: cần cùng lúc có âm Hán Việt,
   * nghĩa tiếng Việt và phép so khớp giữa hai thứ đó — không từ điển
   * Trung-Việt nào khác dựng được danh sách này. Dùng làm hook thu hút người
   * chưa biết gì về tiếng Trung: "bạn đã biết sẵn N từ rồi".
   *
   * So khớp ở tầng service chứ không SQL để dễ đọc và chỉnh: chuẩn hoá
   * `meaningVi` (bỏ phần trong ngoặc như "(khái niệm)", "(LT:個|个[ge4])",
   * tách các nghĩa theo `;`) rồi xem có nghĩa nào trùng đúng âm Hán Việt
   * không. CHỈ nhận trùng khớp CHÍNH XÁC — "chứa" thôi thì ra nhiều từ mà
   * người đọc không thấy giống, làm mất tính thuyết phục của cả danh sách. */
  /**
   * 8 từ cho bộ thẻ "học thử" ở `/hoc-thu` — trang đích của phễu SEO.
   *
   * TRƯỚC 2026-09-22 trang đó lấy thẳng `/words?level=1&pageSize=8`, tức 8 từ
   * HSK1 THÔNG DỤNG NHẤT: 的, 我, 你, 是, 了, 不, 在, 他 — toàn hư từ, không
   * ảnh, và âm Hán Việt chẳng gợi được gì ("đích", "liễu"). Trong khi chính
   * trang đó hứa "âm Hán Việt — cách người Việt nhớ chữ Hán nhanh nhất". Thẻ
   * đầu tiên người lạ nhìn thấy lại là thứ phản chứng cho lời hứa.
   *
   * Giờ lấy từ nhóm "đã biết sẵn" (âm Hán Việt TRÙNG KHỚP nghĩa tiếng Việt,
   * cùng luật với `familiarWords()`) ở HSK1-3: 时间 = "thời gian", 电话 =
   * "điện thoại", 机会 = "cơ hội"... — đọc phát hiểu ngay, đúng thứ khiến
   * người Việt nhận ra mình đã biết sẵn hàng nghìn từ.
   */
  async trialWords(count = 8) {
    const rows = await this.prisma.word.findMany({
      where: {
        hskLevel: { lte: 3 },
        hanViet: { not: null },
        meaningVi: { not: null },
        frequencyRank: { not: null },
      },
      include: { examples: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { frequencyRank: 'asc' },
    });
    return rows.filter((w) => hanVietMatchesMeaning(w)).slice(0, count);
  }

  async familiarWords(level?: number) {
    const rows = await this.prisma.word.findMany({
      where: {
        hanViet: { not: null },
        meaningVi: { not: null },
        frequencyRank: { not: null },
        ...(level ? { hskLevel: level } : {}),
      },
      select: {
        simplified: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
        hskLevel: true,
      },
      orderBy: { frequencyRank: 'asc' },
    });

    const items = rows.filter((w) => hanVietMatchesMeaning(w));

    const byLevel = new Map<number, number>();
    for (const w of items) {
      byLevel.set(w.hskLevel, (byLevel.get(w.hskLevel) ?? 0) + 1);
    }
    return {
      total: items.length,
      byLevel: [...byLevel.entries()]
        .map(([hskLevel, count]) => ({ hskLevel, count }))
        .sort((a, b) => a.hskLevel - b.hskLevel),
      items,
    };
  }

  /** Danh sách Hán tự công khai cho sitemap (chỉ từ CÓ nghĩa tiếng Việt —
   * từ thiếu nghĩa thì trang sẽ mỏng, không nên mời Google index). */
  async publicSlugs() {
    const rows = await this.prisma.word.findMany({
      where: { meaningVi: { not: null } },
      select: { simplified: true, updatedAt: true },
      orderBy: { frequencyRank: 'asc' },
      distinct: ['simplified'],
    });
    return rows;
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
    return this.attachImage(word);
  }
}

/** Âm Hán Việt TRÙNG KHỚP một nghĩa tiếng Việt của từ đó — luật dùng chung
 * cho `/words/familiar` (trang "từ bạn đã biết sẵn") và `/words/trial` (bộ
 * thẻ học thử). Chuẩn hoá `meaningVi`: bỏ phần trong ngoặc rồi tách theo
 * `;`/`,`, so CHÍNH XÁC chứ không "chứa" — nhận cả "chứa" thì lọt nhiều từ
 * người đọc không thấy giống, mất tính thuyết phục của cả danh sách. */
function hanVietMatchesMeaning(w: {
  hanViet: string | null;
  meaningVi: string | null;
}): boolean {
  if (!w.hanViet || !w.meaningVi) return false;
  const hv = w.hanViet.trim().toLowerCase();
  return w.meaningVi
    .replace(/\([^)]*\)/g, '')
    .split(/[;,]/)
    .map((s) => s.trim().toLowerCase())
    .includes(hv);
}
