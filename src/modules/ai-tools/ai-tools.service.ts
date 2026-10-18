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
import type { Word } from '@prisma/client';
import { createHash } from 'node:crypto';
import { pinyin as toPinyin } from 'pinyin-pro';
import { localStudyDate } from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { CHAT_MODELS } from '../assistant/gemini-models';
import { isPremiumActive } from '../premium/premium-plans';
import { segmentLine } from '../videos/word-match.util';
import { WordsService } from '../vocabulary/words.service';
import {
  ANALYZE_SCHEMA,
  analyzePrompt,
  FREE_AI_TOOLS_DAILY_LIMIT,
  hasHan,
  MNEMONIC_SCHEMA,
  mnemonicPrompt,
  normalizeText,
  parseAnalysis,
  parseMnemonic,
  parseSentenceCheck,
  PREMIUM_AI_TOOLS_DAILY_LIMIT,
  PROMPT_VERSION,
  SENTENCE_SCHEMA,
  sentenceCheckPrompt,
  type Analysis,
  type SentenceCheck,
  type WordFacts,
} from './ai-tools.util';

/** Bộ đếm lượt sống qua hết "ngày học" kể cả lệch múi giờ, rồi tự xoá. */
const QUOTA_TTL_SEC = 48 * 3600;
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
  private readonly cutoffHour: number;
  private index: Map<string, IndexWord> | null = null;
  private indexAt = 0;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly words: WordsService,
  ) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.cutoffHour = config.get('STREAK_DAY_CUTOFF_HOUR', { infer: true });
  }

  async usage(userId: string) {
    const { key, limit, premium } = await this.quotaOf(userId);
    const used = Number(await this.redis.client.get(key)) || 0;
    return {
      used: Math.min(used, limit),
      limit,
      premium,
      enabled: !!this.genAI,
    };
  }

  /** Mẹo nhớ theo âm Hán Việt — tạo 1 lần cho mỗi từ rồi lưu `Word.mnemonicVi`,
   * ai mở trang từ cũng thấy (không tốn thêm lượt nào). */
  async mnemonic(userId: string, wordId: string) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
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
    await this.prisma.word.updateMany({
      where: { id: wordId, mnemonicVi: null },
      data: { mnemonicVi: text },
    });
    const saved = await this.prisma.word.findUnique({
      where: { id: wordId },
      select: { mnemonicVi: true },
    });
    return { mnemonicVi: saved?.mnemonicVi ?? text, cached: false, usage };
  }

  /** Chấm câu học viên tự đặt với 1 từ: điểm, câu đã sửa, giải thích tiếng Việt. */
  async checkSentence(userId: string, wordId: string, raw: string) {
    const sentence = normalizeText(raw);
    if (!hasHan(sentence))
      throw new BadRequestException('Câu cần viết bằng chữ Hán');
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
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
    const index = await this.wordIndex();
    const tokens = segmentLine(analysis.zh, index).map((t) => ({
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
    return { source, input: text, ...analysis, tokens, cached, usage };
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
        'Tiện ích AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
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

  private async take(userId: string) {
    if (!this.genAI)
      throw new BadRequestException(
        'Tiện ích AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
      );
    const { key, limit, premium } = await this.quotaOf(userId);
    const used = await this.redis.client.incr(key);
    if (used === 1) await this.redis.client.expire(key, QUOTA_TTL_SEC);
    if (used > limit) {
      await this.redis.client.decr(key);
      throw new ForbiddenException(
        premium
          ? `Hôm nay bạn đã dùng đủ ${limit} lượt AI — mai dùng tiếp nhé.`
          : `Bạn đã dùng hết ${limit} lượt AI miễn phí hôm nay (mẹo nhớ, chấm câu, phân tích câu). Nâng cấp Premium để dùng ${PREMIUM_AI_TOOLS_DAILY_LIMIT} lượt mỗi ngày.`,
      );
    }
    return { used, limit, premium };
  }

  private async refund(userId: string) {
    const { key } = await this.quotaOf(userId);
    await this.redis.client.decr(key).catch(() => undefined);
  }

  private async quotaOf(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { premiumUntil: true, timezone: true },
    });
    const premium = isPremiumActive(user.premiumUntil);
    const day = localStudyDate(new Date(), user.timezone, this.cutoffHour);
    return {
      key: `aitools:${userId}:${day}`,
      limit: premium ? PREMIUM_AI_TOOLS_DAILY_LIMIT : FREE_AI_TOOLS_DAILY_LIMIT,
      premium,
    };
  }

  /** Bảng từ trong tiến trình (như `ScanService`) — khớp cả phồn thể, giản thể
   * ưu tiên khi trùng; chữ đồng tự giữ dòng cấp thấp, thông dụng hơn. */
  private async wordIndex(): Promise<Map<string, IndexWord>> {
    if (this.index && Date.now() - this.indexAt < 3_600_000) return this.index;
    const rows = await this.prisma.word.findMany({
      select: {
        id: true,
        simplified: true,
        traditional: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
        hskLevel: true,
      },
      orderBy: [
        { hskLevel: 'asc' },
        { frequencyRank: { sort: 'asc', nulls: 'last' } },
      ],
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
