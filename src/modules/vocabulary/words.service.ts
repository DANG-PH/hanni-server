import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  And,
  type FindOptionsWhere,
  ILike,
  In,
  IsNull,
  LessThanOrEqual,
  Like,
  Not,
  Repository,
} from 'typeorm';
import { paginate, type Paginated } from '../../common/dto/pagination.dto';
import {
  Lesson,
  Video,
  VideoLine,
  Word,
  WordExample,
} from '../../database/entities';
import { WordPos } from '../../database/enums';
import { likeEscape } from '../../database/repository.util';
import type { WordQueryDto } from './dto/word-query.dto';
import { radicalOf } from './radicals';
import {
  prepareQuery,
  rankWords,
  toSearchRow,
  type SearchRow,
} from './word-search.util';
import {
  imageQueryFrom,
  searchCommonsImage,
  searchWikipediaImage,
} from './word-image.util';

/** Cấp HSK cao nhất còn tự lấy ảnh minh hoạ — xem lý do ở `attachImage()`. */
const IMAGE_MAX_HSK_LEVEL = 5;

/** Bảng tìm kiếm trong bộ nhớ sống bao lâu — từ vựng chỉ đổi khi deploy (pm2 khởi động lại). */
const SEARCH_INDEX_TTL_MS = 3_600_000;

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(WordExample)
    private readonly examples: Repository<WordExample>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(VideoLine)
    private readonly videoLines: Repository<VideoLine>,
  ) {}

  private searchIndex: SearchRow[] | null = null;
  private searchIndexAt = 0;
  /** Bộ thủ + số nét từng chữ (Unihan, `data/curated/char-info.json`) — đọc 1 lần. */
  private charInfo: Record<string, [string, number | null]> | null = null;

  /** ~11k dòng nhẹ (chỉ cột để so khớp) — xếp hạng làm trong bộ nhớ, xem word-search.util.ts. */
  private async getSearchIndex(): Promise<SearchRow[]> {
    if (
      this.searchIndex &&
      Date.now() - this.searchIndexAt < SEARCH_INDEX_TTL_MS
    )
      return this.searchIndex;
    const rows = await this.words.find({
      select: {
        id: true,
        simplified: true,
        traditional: true,
        hskLevel: true,
        frequencyRank: true,
        pinyinNumeric: true,
        hanViet: true,
        meaningVi: true,
        meaningEn: true,
      },
    });
    this.searchIndex = rows.map(toSearchRow);
    this.searchIndexAt = Date.now();
    return this.searchIndex;
  }

  /** Tra từ có xếp hạng (ô tra từ điển + gợi ý khi gõ) — trùng mặt chữ, âm Hán
   * Việt, pinyin không dấu lên trước; nghĩa tiếng Anh xuống cuối.
   *
   * LUỒNG (GET /words?q=… — client: components/dictionary/dictionary-search.tsx gợi ý khi gõ,
   * app/(site)/tu-dien/page.tsx trang kết quả):
   *   1. getSearchIndex(): ~11k từ, chỉ các cột cần so khớp, đọc DB 1 lần rồi giữ trong RAM 1 giờ
   *      (SEARCH_INDEX_TTL_MS) — không truy vấn LIKE trên DB mỗi phím gõ.
   *   2. prepareQuery(q) (word-search.util.ts): bỏ dấu tiếng Việt + dấu thanh pinyin, viết liền pinyin,
   *      nhận ra người dùng gõ có dấu hay không, 1 âm tiết hay cả cụm.
   *   3. rankWords(): scoreWord() chấm BẬC khớp từng từ (0 trùng mặt chữ … 7 chứa trong nghĩa tiếng Anh,
   *      bảng bậc ở đầu word-search.util.ts), rồi xếp: bậc → cấp HSK thấp → từ thông dụng.
   *   4. Cắt đúng trang (skip/take từ pageSize), nạp đủ cột của các từ trong trang rồi trả về.
   * Sửa thứ tự kết quả = sửa scoreWord()/bảng bậc; có test ở word-search.util.spec.ts. */
  private async search(query: WordQueryDto): Promise<Paginated<unknown>> {
    const ranked = rankWords(
      await this.getSearchIndex(),
      prepareQuery(query.q!),
      query.level,
    );
    const pageIds = ranked
      .slice(query.skip, query.skip + query.take)
      .map((r) => r.id);
    const rows = await this.words.findBy({ id: In(pageIds) });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = pageIds
      .map((id) => byId.get(id))
      .filter((w): w is Word => Boolean(w));
    return paginate(items, ranked.length, query);
  }

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
    await this.words.update(word.id, { imageUrl }).catch(() => undefined);
    return { ...word, imageUrl };
  }

  async list(query: WordQueryDto): Promise<Paginated<unknown>> {
    if (query.q?.trim() && !query.lessonId && !query.needsReview)
      return this.search(query);
    const base: FindOptionsWhere<Word> = {};
    if (query.level) base.hskLevel = query.level;
    if (query.lessonId) base.lessonId = query.lessonId;
    if (query.needsReview === 'true') base.needsReview = true;
    if (query.needsReview === 'false') base.needsReview = false;
    let where: FindOptionsWhere<Word> | FindOptionsWhere<Word>[] = base;
    if (query.q) {
      const q = query.q.trim();
      const has = `%${likeEscape(q)}%`;
      // Mảng where = HOẶC: khớp ở bất kỳ cột nào (mặt chữ/pinyin phân biệt hoa thường như cũ).
      where = [
        { ...base, simplified: Like(has) },
        { ...base, traditional: Like(has) },
        { ...base, pinyinNumeric: Like(`%${likeEscape(q.toLowerCase())}%`) },
        { ...base, pinyin: Like(has) },
        { ...base, meaningVi: ILike(has) },
        { ...base, meaningEn: ILike(has) },
        // tìm bằng âm Hán Việt — vd gõ "học hiệu" ra được 学校 dù nghĩa
        // tiếng Việt hiển thị là "trường học" (không trùng chuỗi)
        { ...base, hanViet: ILike(has) },
      ];
    }

    const [items, total] = await this.words.findAndCount({
      where,
      order: query.lessonId
        ? { lessonOrder: 'ASC', simplified: 'ASC' }
        : { frequencyRank: 'ASC', simplified: 'ASC' },
      skip: query.skip,
      take: query.take,
    });

    return paginate(items, total, query);
  }

  async get(id: string) {
    const word = await this.words.findOne({
      where: { id },
      relations: { examples: true },
      order: { examples: { orderIndex: 'ASC' } },
    });
    if (!word) throw new NotFoundException('Không tìm thấy từ');
    return this.attachImage(word);
  }

  /** Thống kê công khai cho trang chủ (chưa đăng nhập) — "bạn đã biết trước
   * bao nhiêu từ nhờ âm Hán Việt", điểm khác biệt cốt lõi của Hanni. */
  async stats() {
    const [total, withHanViet] = await Promise.all([
      this.words.count(),
      this.words.countBy({ hanViet: Not(IsNull()) }),
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
    const words = await this.words.find({
      where: { simplified: slug },
      relations: { examples: true },
      order: {
        frequencyRank: 'ASC',
        hskLevel: 'ASC',
        examples: { orderIndex: 'ASC' },
      },
    });
    if (words.length === 0) throw new NotFoundException('Không tìm thấy từ');

    // Từ CÙNG CHỦ ĐỀ (cùng bài học) — trước 2026-10-19 là 12 từ thông dụng nhất cùng cấp (的, 我, 你…),
    // chẳng liên quan gì tới từ đang tra. Từ không thuộc bài nào thì mới rơi về cùng cấp.
    const lessonId = words[0].lessonId;
    const [topic, related] = await Promise.all([
      lessonId
        ? this.lessons.findOne({
            where: { id: lessonId },
            select: { id: true, title: true, hskLevel: true, orderIndex: true },
          })
        : null,
      this.words.find({
        where: {
          ...(lessonId ? { lessonId } : { hskLevel: words[0].hskLevel }),
          simplified: Not(slug),
          meaningVi: Not(IsNull()),
        },
        select: {
          simplified: true,
          pinyin: true,
          meaningVi: true,
          hanViet: true,
        },
        order: lessonId ? { lessonOrder: 'ASC' } : { frequencyRank: 'ASC' },
        take: 16,
      }),
    ]);

    const [characters, compounds, videos, glyphs, measures] = await Promise.all(
      [
        this.breakDownCharacters(words[0]),
        this.compoundsContaining(slug),
        this.videosUsingWord(slug),
        this.glyphsOf(words[0]),
        this.measureWordsOf(words),
      ],
    );
    return {
      words,
      related,
      topic,
      characters,
      compounds,
      videos,
      glyphs,
      measures,
    };
  }

  private loadCharInfo() {
    if (!this.charInfo)
      this.charInfo = JSON.parse(
        readFileSync(
          join(process.cwd(), 'data', 'curated', 'char-info.json'),
          'utf8',
        ),
      ) as Record<string, [string, number | null]>;
    return this.charInfo;
  }

  /** Tab "Hán tự" của từ điển: 1 chữ — bộ thủ, số nét, âm Hán Việt + pinyin (chữ không đứng riêng
   * thành từ như 校 thì lấy âm hay gặp nhất của nó trong các từ chứa nó: 学校 học hiệu → hiệu), nghĩa
   * riêng nếu có, và các từ chứa chữ đó (cấp thấp, thông dụng trước). */
  async charLookup(raw: string) {
    const char = Array.from(raw.trim())[0];
    if (!char || !/\p{Script=Han}/u.test(char))
      throw new NotFoundException('Không phải chữ Hán');
    const info = this.loadCharInfo()[char];
    const has = `%${likeEscape(char)}%`;
    const words = await this.words.find({
      where: [{ simplified: Like(has) }, { traditional: Like(has) }],
      select: {
        simplified: true,
        traditional: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
        hskLevel: true,
      },
      order: {
        hskLevel: 'ASC',
        frequencyRank: { direction: 'ASC', nulls: 'LAST' },
      },
      take: 60,
    });
    if (!info && words.length === 0)
      throw new NotFoundException('Không có chữ này trong từ vựng HSK');
    // Tra chữ phồn thể (學) thì mục từ là chữ giản thể tương ứng (学).
    const own = words.find(
      (w) => w.simplified === char || w.traditional === char,
    );
    const at = (w: (typeof words)[number]) => {
      const i = Array.from(w.simplified).indexOf(char);
      return i >= 0 ? i : Array.from(w.traditional ?? '').indexOf(char);
    };
    const vote = (
      pick: (w: (typeof words)[number], i: number) => string | null,
    ) => {
      const count = new Map<string, number>();
      for (const w of words) {
        const i = at(w);
        const v = i >= 0 ? pick(w, i) : null;
        if (v) count.set(v, (count.get(v) ?? 0) + 1);
      }
      return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    };
    const aligned = (s: string | null, w: (typeof words)[number]) => {
      const parts = s ? s.split(/\s+/) : [];
      return parts.length === Array.from(w.simplified).length ? parts : null;
    };
    return {
      char,
      strokes: info?.[1] ?? null,
      radical: info ? radicalOf(info[0]) : null,
      hanViet:
        own?.hanViet ?? vote((w, i) => aligned(w.hanViet, w)?.[i] ?? null),
      pinyin: own?.pinyin ?? vote((w, i) => aligned(w.pinyin, w)?.[i] ?? null),
      meaningVi: own?.meaningVi ?? null,
      hskLevel: own?.hskLevel ?? words[0]?.hskLevel ?? null,
      wordSlug: own?.simplified ?? null,
      words: words.filter((w) => w !== own && w.meaningVi).slice(0, 30),
    };
  }

  /** Khung "Hán tự" ở trang từ (như Hanzii): từng chữ kèm âm Hán Việt, pinyin, nghĩa riêng (nếu chữ
   * đứng được thành từ), bộ thủ + tên Hán Việt của bộ, số nét, chữ phồn thể tương ứng. */
  private async glyphsOf(word: Word) {
    const charInfo = this.loadCharInfo();
    const chars = Array.from(word.simplified).filter((c) =>
      /\p{Script=Han}/u.test(c),
    );
    const trad = word.traditional ? Array.from(word.traditional) : [];
    const readings = word.hanViet ? word.hanViet.split(/\s+/) : [];
    const syllables = word.pinyin.split(/\s+/);
    const singles = await this.words.find({
      where: { simplified: In(chars) },
      select: {
        id: true,
        simplified: true,
        pinyin: true,
        meaningVi: true,
        hanViet: true,
      },
      order: { frequencyRank: 'ASC' },
    });
    const byChar = new Map<string, (typeof singles)[number]>();
    for (const r of singles)
      if (!byChar.has(r.simplified)) byChar.set(r.simplified, r);
    return chars.map((char, i) => {
      const own = byChar.get(char);
      const info = charInfo[char];
      const t = trad.length === chars.length ? trad[i] : null;
      return {
        char,
        traditional: t && t !== char ? t : null,
        hanViet:
          (readings.length === chars.length ? readings[i] : null) ??
          own?.hanViet ??
          null,
        pinyin:
          own?.pinyin ??
          (syllables.length === chars.length ? syllables[i] : null),
        meaningVi: own?.meaningVi ?? null,
        strokes: info?.[1] ?? null,
        radical: info ? radicalOf(info[0]) : null,
      };
    });
  }

  /** Lượng từ ("本|ben3") kèm pinyin có dấu, âm Hán Việt — lấy từ chính mục từ của lượng từ đó. */
  private async measureWordsOf(words: Word[]) {
    const codes = [...new Set(words.flatMap((w) => w.measureWords ?? []))];
    if (codes.length === 0) return [];
    const parsed = codes.map((c) => {
      const [char, pn] = c.split('|');
      return { char, pn };
    });
    const rows = await this.words.find({
      where: { simplified: In(parsed.map((p) => p.char)) },
      select: {
        id: true,
        simplified: true,
        pinyin: true,
        pinyinNumeric: true,
        hanViet: true,
        meaningVi: true,
      },
    });
    return parsed.map(({ char, pn }) => {
      const hit =
        rows.find((r) => r.simplified === char && r.pinyinNumeric === pn) ??
        rows.find((r) => r.simplified === char);
      return {
        char,
        pinyin: hit?.pinyin ?? pn,
        hanViet: hit?.hanViet ?? null,
        inDictionary: !!hit,
      };
    });
  }

  /** Tìm trong câu ví dụ (tab "Ví dụ" ở từ điển): có chữ Hán thì tìm theo câu tiếng Trung, không
   * thì theo bản dịch tiếng Việt. Chỉ câu Hanni soạn (HSK 1–3 hiện có). */
  async searchExamples(raw: string, page = 1) {
    const q = raw.trim().slice(0, 40);
    if (!q) return { items: [], total: 0, page: 1, pageSize: 20 };
    const has = `%${likeEscape(q)}%`;
    const where: FindOptionsWhere<WordExample> = /\p{Script=Han}/u.test(q)
      ? { zh: Like(has) }
      : { vi: ILike(has) };
    const pageSize = 20;
    const [rows, total] = await this.examples.findAndCount({
      where,
      relations: { word: true },
      order: { word: { hskLevel: 'ASC' }, zh: 'ASC', id: 'ASC' },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
    });
    const items = rows.map((e) => ({
      id: e.id,
      zh: e.zh,
      pinyin: e.pinyin,
      vi: e.vi,
      word: {
        simplified: e.word.simplified,
        pinyin: e.word.pinyin,
        hanViet: e.word.hanViet,
        hskLevel: e.word.hskLevel,
      },
    }));
    return { items, total, page: Math.max(1, page), pageSize };
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
    // 3 video có nhiều câu thoại chứa từ này nhất.
    const rows = await this.videoLines
      .createQueryBuilder('line')
      .select('line.videoId', 'videoId')
      .addSelect('COUNT(*)::int', 'count')
      .where('line.zh LIKE :has', { has: `%${likeEscape(slug)}%` })
      .groupBy('line.videoId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(3)
      .getRawMany<{ videoId: string; count: number }>();
    if (rows.length === 0) return [];
    const videos = await this.videos.find({
      where: { id: In(rows.map((r) => r.videoId)) },
      select: { id: true, title: true, thumbnailUrl: true, hskLevel: true },
    });
    const countById = new Map(rows.map((r) => [r.videoId, r.count]));
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
  async breakDownCharacters(word: Word) {
    const chars = Array.from(word.simplified);
    if (chars.length < 2) return [];
    const readings = word.hanViet ? word.hanViet.split(/\s+/) : [];
    // Chỉ dùng khi số âm khớp số chữ — lệch thì thà bỏ còn hơn gán sai âm.
    const aligned = readings.length === chars.length;

    const singles = await this.words.find({
      where: { simplified: In(chars), meaningVi: Not(IsNull()) },
      select: { id: true, simplified: true, pinyin: true, meaningVi: true },
      order: { frequencyRank: 'ASC' },
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
    return this.words.find({
      where: {
        simplified: And(Like(`%${likeEscape(key)}%`), Not(slug)),
        meaningVi: Not(IsNull()),
        hanViet: Not(IsNull()),
      },
      select: {
        simplified: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
      },
      order: { frequencyRank: 'ASC' },
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
    const rows = await this.words.find({
      where: {
        hskLevel: LessThanOrEqual(3),
        hanViet: Not(IsNull()),
        meaningVi: Not(IsNull()),
        frequencyRank: Not(IsNull()),
      },
      relations: { examples: true },
      order: { frequencyRank: 'ASC', examples: { orderIndex: 'ASC' } },
    });
    return rows.filter((w) => hanVietMatchesMeaning(w)).slice(0, count);
  }

  async familiarWords(level?: number) {
    const rows = await this.words.find({
      where: {
        hanViet: Not(IsNull()),
        meaningVi: Not(IsNull()),
        frequencyRank: Not(IsNull()),
        ...(level ? { hskLevel: level } : {}),
      },
      select: {
        simplified: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
        hskLevel: true,
      },
      order: { frequencyRank: 'ASC' },
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
    const rows = await this.words.find({
      where: { meaningVi: Not(IsNull()) },
      select: { simplified: true, updatedAt: true },
      order: { frequencyRank: 'ASC' },
    });
    // 1 URL cho mỗi mặt chữ (từ đa âm có nhiều dòng) — giữ dòng thông dụng nhất.
    const seen = new Set<string>();
    return rows.filter(
      (r) => !seen.has(r.simplified) && seen.add(r.simplified),
    );
  }

  /** "Từ vựng hôm nay": chọn CỐ ĐỊNH theo ngày (giống nhau cho mọi user, đổi
   * lúc 0h UTC) — xoay vòng theo `frequencyRank` (chỉ từ phổ biến, có nghĩa)
   * để tránh rơi vào từ hiếm ít ai biết. Không lưu DB, tính trực tiếp mỗi lần
   * gọi nên luôn khớp ngày hiện tại kể cả khi có từ mới được thêm vào.
   * `level` (1–7, 7 = HSK 7–9) giới hạn đúng cấp người học đang học. */
  async ofTheDay(level?: number) {
    const where: FindOptionsWhere<Word> = {
      meaningVi: Not(IsNull()),
      frequencyRank: Not(IsNull()),
      ...(level && level >= 1 && level <= 9 ? { hskLevel: level } : {}),
    };
    const total = await this.words.countBy(where);
    if (total === 0) throw new NotFoundException('Chưa có dữ liệu từ vựng');

    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const [pick] = await this.words.find({
      where,
      order: { frequencyRank: 'ASC' },
      skip: dayIndex % total,
      take: 1,
      select: { id: true },
    });
    if (!pick) throw new NotFoundException('Chưa có dữ liệu từ vựng');
    return this.get(pick.id);
  }
}

/** Âm Hán Việt TRÙNG KHỚP một nghĩa tiếng Việt của từ đó — luật dùng chung
 * cho `/words/familiar` (trang "từ bạn đã biết sẵn"), `/words/trial` (bộ
 * thẻ học thử), quét ảnh và báo cáo học tập. Chuẩn hoá `meaningVi`: bỏ phần
 * trong ngoặc rồi tách theo `;`/`,`, so CHÍNH XÁC chứ không "chứa" — nhận cả
 * "chứa" thì lọt nhiều từ người đọc không thấy giống, mất tính thuyết phục
 * của cả danh sách. */
export function hanVietMatchesMeaning(w: {
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
