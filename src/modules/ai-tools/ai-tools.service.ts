import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { pinyin as toPinyin } from 'pinyin-pro';
import { IsNull, Repository } from 'typeorm';
import type { Env } from '../../config/env.validation';
import { isUniqueViolation } from '../../database/db-errors';
import { Lesson, LessonReading, Word } from '../../database/entities';
import { DailyQuotaService } from '../../infra/redis/daily-quota.service';
import { RedisService } from '../../infra/redis/redis.service';
import { CHAT_MODELS } from '../assistant/gemini-models';
import type { PinyinOverrides } from '../mock-exams/mock-exam.content';
import { segmentLine } from '../videos/word-match.util';
import {
  examplePinyin,
  pinyinOverrides,
} from '../vocabulary/example-pinyin.util';
import { WordsService } from '../vocabulary/words.service';
import {
  ANALYZE_SCHEMA,
  analyzePrompt,
  FREE_AI_TOOLS_DAILY_LIMIT,
  hasHan,
  lessonWordsUsed,
  MNEMONIC_SCHEMA,
  mnemonicPrompt,
  normalizeText,
  parseAnalysis,
  parseMnemonic,
  parseSentenceCheck,
  PREMIUM_AI_TOOLS_DAILY_LIMIT,
  outOfLevelChars,
  parseReading,
  PROMPT_VERSION,
  READING_FULL_LIST_MAX_LEVEL,
  READING_SCHEMA,
  readingPrompt,
  SENTENCE_SCHEMA,
  stripSpeaker,
  sentenceCheckPrompt,
  type Analysis,
  type ReadingDraft,
  type ReadingSentence,
  type SentenceCheck,
  type WordFacts,
} from './ai-tools.util';

/** Bộ đếm lượt sống qua hết "ngày học" kể cả lệch múi giờ, rồi tự xoá. */
const AI_TOOLS_QUOTA = {
  name: 'aitools',
  free: FREE_AI_TOOLS_DAILY_LIMIT,
  premium: PREMIUM_AI_TOOLS_DAILY_LIMIT,
};
/** Câu đã chấm / đã phân tích giữ 30 ngày — gõ lại đúng câu đó không tốn lượt. */
const CACHE_TTL_SEC = 30 * 24 * 3600;

const hash = (s: string) =>
  createHash('sha1').update(s).digest('hex').slice(0, 20);

interface IndexWord {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  hanViet: string | null;
  meaningVi: string | null;
  hskLevel: number;
}

/** Xem `ai-tools.util.ts` — 3 tiện ích AI dùng chung 1 hạn mức/ngày. */
@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);
  private readonly genAI: GoogleGenAI | null;
  private index: Map<string, IndexWord> | null = null;
  private indexAt = 0;
  /** Bảng chữ/từ theo cấp + bảng đọc pinyin cho bài đọc — dữ liệu từ điển gần như không đổi. */
  private vocabCache: {
    at: number;
    chars: Map<number, Set<string>>;
    words: Map<number, string[]>;
    overrides: PinyinOverrides;
  } | null = null;

  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(Word) private readonly wordRepo: Repository<Word>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonReading)
    private readonly readings: Repository<LessonReading>,
    private readonly redis: RedisService,
    private readonly quota: DailyQuotaService,
    private readonly words: WordsService,
  ) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  /** Mẹo nhớ theo âm Hán Việt — tạo 1 lần cho mỗi từ rồi lưu `Word.mnemonicVi`,
   * ai mở trang từ cũng thấy (không tốn thêm lượt nào). */
  async mnemonic(userId: string, wordId: string) {
    const word = await this.wordRepo.findOneBy({ id: wordId });
    if (!word) throw new NotFoundException('Không tìm thấy từ');
    if (word.mnemonicVi) return { mnemonicVi: word.mnemonicVi, cached: true };
    const facts = await this.factsOf(word);
    const usage = await this.take(userId);
    const text = await this.generate(
      mnemonicPrompt(facts),
      MNEMONIC_SCHEMA,
      parseMnemonic,
    );
    if (!text) {
      await this.refund(userId);
      throw new ServiceUnavailableException(
        'AI đang bận, thử lại sau ít phút nhé.',
      );
    }
    // Ai đó vừa tạo xong cùng lúc thì giữ bản đã lưu, không ghi đè.
    await this.wordRepo.update(
      { id: wordId, mnemonicVi: IsNull() },
      { mnemonicVi: text },
    );
    const saved = await this.wordRepo.findOne({
      where: { id: wordId },
      select: { id: true, mnemonicVi: true },
    });
    return { mnemonicVi: saved?.mnemonicVi ?? text, cached: false, usage };
  }

  /** Chấm câu học viên tự đặt với 1 từ: điểm, câu đã sửa, giải thích tiếng Việt. */
  async checkSentence(userId: string, wordId: string, raw: string) {
    const sentence = normalizeText(raw);
    if (!hasHan(sentence))
      throw new BadRequestException('Câu cần viết bằng chữ Hán');
    const word = await this.wordRepo.findOneBy({ id: wordId });
    if (!word) throw new NotFoundException('Không tìm thấy từ');
    const key = `aitools:check:v${PROMPT_VERSION}:${wordId}:${hash(sentence)}`;
    const cached = await this.redis
      .getJson<SentenceCheck>(key)
      .catch(() => null);
    if (cached) return { ...cached, sentence, cached: true };
    const facts = await this.factsOf(word);
    const usage = await this.take(userId);
    const result = await this.generate(
      sentenceCheckPrompt(facts, sentence),
      SENTENCE_SCHEMA,
      parseSentenceCheck,
    );
    if (!result) {
      await this.refund(userId);
      throw new ServiceUnavailableException(
        'AI đang bận, thử lại sau ít phút nhé.',
      );
    }
    await this.redis.setJson(key, result, CACHE_TTL_SEC).catch(() => undefined);
    return { ...result, sentence, cached: false, usage };
  }

  /** Phân tích câu tiếng Trung (dịch + ngữ pháp) hoặc dịch câu tiếng Việt sang
   * tiếng Trung; câu tiếng Trung tách theo từ điển Hanni (Hán Việt, nghĩa, link). */
  async analyze(userId: string, raw: string) {
    const text = normalizeText(raw);
    if (!text) throw new BadRequestException('Nhập câu cần phân tích');
    const source = hasHan(text) ? 'zh' : 'vi';
    const key = `aitools:analyze:v${PROMPT_VERSION}:${source}:${hash(text)}`;
    let analysis = await this.redis.getJson<Analysis>(key).catch(() => null);
    const cached = !!analysis;
    let usage: Awaited<ReturnType<AiToolsService['take']>> | undefined;
    if (!analysis) {
      usage = await this.take(userId);
      analysis = await this.generate(
        analyzePrompt(text, source),
        ANALYZE_SCHEMA,
        parseAnalysis,
      );
      if (!analysis) {
        await this.refund(userId);
        throw new ServiceUnavailableException(
          'AI đang bận, thử lại sau ít phút nhé.',
        );
      }
      await this.redis
        .setJson(key, analysis, CACHE_TTL_SEC)
        .catch(() => undefined);
    }
    const tokens = this.tokensOf(analysis.zh, await this.wordIndex());
    return { source, input: text, ...analysis, tokens, cached, usage };
  }

  /** Tách đoạn văn theo từ điển Hanni — pinyin + âm Hán Việt + nghĩa từng từ, KHÔNG gọi AI nên không tốn
   * lượt và khách dùng được (như "Convert pinyin" của Hanbeego, thêm âm Hán Việt). Ô tra từ điển gọi khi
   * người học dán cả câu; phân tích ngữ pháp + dịch bằng AI vẫn là bước thêm ở `analyze`. */
  async segment(text: string) {
    return { tokens: this.tokensOf(text, await this.wordIndex()) };
  }

  private tokensOf(zh: string, index: Map<string, IndexWord>) {
    return segmentLine(zh, index).map((t) => ({
      text: t.text,
      wordId: t.word?.id ?? null,
      simplified: t.word?.simplified ?? null,
      pinyin:
        t.word?.pinyin ??
        (hasHan(t.text)
          ? toPinyin(t.text, { toneType: 'symbol', nonZh: 'removed' })
          : null),
      hanViet: t.word?.hanViet ?? null,
      meaningVi: t.word?.meaningVi?.split(';')[0].trim() ?? null,
      hskLevel: t.word?.hskLevel ?? null,
    }));
  }

  /** Bài đọc của 1 bài học (đã có thì ai cũng đọc được) + từ của bài để tô sáng. */
  async reading(lessonId: string) {
    const info = await this.lessons.findOne({
      where: { id: lessonId },
      select: { id: true, title: true, hskLevel: true, orderIndex: true },
    });
    if (!info) throw new NotFoundException('Không tìm thấy bài học');
    const [reading, words] = await Promise.all([
      this.readings.findOneBy({ lessonId }),
      this.wordRepo.find({
        where: { lessonId },
        order: { lessonOrder: 'ASC' },
        select: {
          id: true,
          simplified: true,
          pinyin: true,
          hanViet: true,
          meaningVi: true,
          audioUrl: true,
        },
      }),
    ]);
    // Bài lưu trước khi bỏ tiền tố "A:" trong câu dịch cũng hiện sạch.
    const sentences = reading
      ? (
          reading.sentences as (ReadingSentence & {
            pinyin: string;
          })[]
        ).map((s) => ({ ...s, vi: stripSpeaker(s.vi) }))
      : null;
    return {
      lesson: info,
      words,
      reading:
        reading && sentences
          ? {
              title: reading.title,
              sentences,
              createdAt: reading.createdAt,
              wordsUsed: lessonWordsUsed(sentences, words),
            }
          : null,
      enabled: !!this.genAI,
    };
  }

  /** AI viết bài đọc chỉ dùng từ của bài + chữ thuộc HSK ≤ cấp bài; vượt cấp thì bắt viết
   * lại 1 lần (kèm danh sách chữ cấm), vẫn vượt thì thôi và hoàn lượt. Tạo 1 lần dùng chung. */
  async createReading(userId: string, lessonId: string) {
    const current = await this.reading(lessonId);
    if (current.reading) return { ...current, cached: true };
    const usage = await this.take(userId);
    const draft = await this.writeReading(current.lesson, current.words);
    if (!draft) {
      await this.refund(userId);
      throw new ServiceUnavailableException(
        'AI chưa viết được bài đọc đúng cấp — thử lại sau ít phút nhé.',
      );
    }
    const { overrides } = await this.vocab();
    const sentences = draft.sentences.map((s) => ({
      ...s,
      pinyin: examplePinyin(s.zh, overrides),
    }));
    try {
      await this.readings.insert({ lessonId, title: draft.title, sentences });
    } catch (err) {
      // Người khác vừa tạo xong cùng lúc thì giữ bản đã lưu.
      if (!isUniqueViolation(err)) throw err;
    }
    return { ...(await this.reading(lessonId)), cached: false, usage };
  }

  private async writeReading(
    lesson: { id: string; title: string; hskLevel: number },
    words: { simplified: string; pinyin: string; meaningVi: string | null }[],
  ): Promise<ReadingDraft | null> {
    const { chars, words: levelWords } = await this.vocab();
    const allowed = chars.get(lesson.hskLevel) ?? new Set<string>();
    const allowedWords =
      lesson.hskLevel <= READING_FULL_LIST_MAX_LEVEL
        ? (levelWords.get(lesson.hskLevel) ?? null)
        : null;
    let forbiddenChars: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const draft = await this.generate(
        readingPrompt({
          hskLevel: lesson.hskLevel,
          lessonTitle: lesson.title,
          lessonWords: words,
          allowedWords,
          forbiddenChars,
        }),
        READING_SCHEMA,
        parseReading,
      );
      if (!draft) return null;
      const bad = outOfLevelChars(draft.sentences, allowed);
      if (bad.length === 0) return draft;
      this.logger.warn(
        `[AiTools] bài đọc ${lesson.id} có chữ vượt cấp: ${bad.join('')}`,
      );
      forbiddenChars = [...new Set([...forbiddenChars, ...bad])];
    }
    return null;
  }

  private async vocab() {
    if (this.vocabCache && Date.now() - this.vocabCache.at < 3_600_000)
      return this.vocabCache;
    const rows = await this.wordRepo.find({
      select: { id: true, simplified: true, pinyin: true, hskLevel: true },
      order: {
        hskLevel: 'ASC',
        frequencyRank: { direction: 'ASC', nulls: 'LAST' },
      },
    });
    const chars = new Map<number, Set<string>>();
    const words = new Map<number, string[]>();
    const maxLevel = Math.max(...rows.map((r) => r.hskLevel));
    for (let level = 1; level <= maxLevel; level++) {
      const upTo = rows.filter((r) => r.hskLevel <= level);
      chars.set(
        level,
        new Set(upTo.flatMap((r) => [...r.simplified].filter(hasHan))),
      );
      words.set(level, [
        ...new Set(
          upTo.map((r) => r.simplified.replace(/[（(][^）)]*[）)]/g, '')),
        ),
      ]);
    }
    this.vocabCache = {
      at: Date.now(),
      chars,
      words,
      overrides: pinyinOverrides(rows),
    };
    return this.vocabCache;
  }

  private async factsOf(word: Word): Promise<WordFacts> {
    const chars = await this.words.breakDownCharacters(word);
    return {
      simplified: word.simplified,
      pinyin: word.pinyin,
      hanViet: word.hanViet,
      meaningVi: word.meaningVi,
      hskLevel: word.hskLevel,
      chars: chars.map((c) => ({
        char: c.char,
        hanViet: c.hanViet,
        meaningVi: c.meaningVi,
      })),
    };
  }

  private async generate<T>(
    prompt: string,
    schema: object,
    parse: (text: string) => T | null,
  ): Promise<T | null> {
    if (!this.genAI)
      throw new BadRequestException(
        'Tính năng AI đang tạm đóng — thử lại sau nhé.',
      );
    for (const model of CHAT_MODELS) {
      try {
        const response = await this.genAI.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        const parsed = response.text ? parse(response.text) : null;
        if (parsed) return parsed;
      } catch (err) {
        this.logger.warn(
          `[AiTools] model ${model} lỗi: ${(err as Error).message}`,
        );
      }
    }
    return null;
  }

  /** 1 lượt AI (chung mẹo nhớ, chấm câu, phân tích câu, bài đọc) — hết lượt thì báo, AI lỗi thì `refund()`. */
  private async take(userId: string) {
    if (!this.genAI)
      throw new BadRequestException(
        'Tính năng AI đang tạm đóng — thử lại sau nhé.',
      );
    const q = await this.quota.take(userId, AI_TOOLS_QUOTA);
    if (!q.ok)
      throw new ForbiddenException(
        q.premium
          ? `Hôm nay bạn đã dùng đủ ${q.limit} lượt AI — mai dùng tiếp nhé.`
          : `Bạn đã dùng hết ${q.limit} lượt AI miễn phí hôm nay (mẹo nhớ, chấm câu, phân tích câu). Nâng cấp Premium để dùng ${PREMIUM_AI_TOOLS_DAILY_LIMIT} lượt mỗi ngày.`,
      );
    return q;
  }

  private refund(userId: string) {
    return this.quota.refund(userId, AI_TOOLS_QUOTA);
  }

  /** Bảng từ trong tiến trình (như `ScanService`) — khớp cả phồn thể, giản thể
   * ưu tiên khi trùng; chữ đồng tự giữ dòng cấp thấp, thông dụng hơn. */
  private async wordIndex(): Promise<Map<string, IndexWord>> {
    if (this.index && Date.now() - this.indexAt < 3_600_000) return this.index;
    const rows = await this.wordRepo.find({
      select: {
        id: true,
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
    });
    const index = new Map<string, IndexWord>();
    for (const w of rows)
      if (!index.has(w.simplified)) index.set(w.simplified, w);
    for (const w of rows)
      if (w.traditional && !index.has(w.traditional))
        index.set(w.traditional, w);
    this.index = index;
    this.indexAt = Date.now();
    return index;
  }
}
