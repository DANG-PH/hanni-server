import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { pinyin } from 'pinyin-pro';
import { localStudyDate } from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { CHAT_MODELS } from '../assistant/gemini-models';
import { isPremiumActive } from '../premium/premium-plans';
import { segmentLine } from '../videos/word-match.util';
import { hanVietMatchesMeaning } from '../vocabulary/words.service';
import {
  FREE_SCAN_DAILY_LIMIT,
  hasHan,
  parseScanJson,
  PREMIUM_SCAN_DAILY_LIMIT,
  SCAN_MIME_TYPES,
  SCAN_PROMPT,
  SCAN_SCHEMA,
  type ScanJson,
  type ScanLine,
} from './scan.util';

interface ScanWord {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  hanViet: string | null;
  meaningVi: string | null;
  hskLevel: number;
  audioUrl: string | null;
}

/** Bộ đếm lượt sống qua hết "ngày học" kể cả lệch múi giờ, rồi tự xoá. */
const QUOTA_TTL_SEC = 48 * 3600;

/**
 * Quét ảnh (OCR + nhận diện đồ vật) bằng Gemini — xem `SCAN_PROMPT`. Ảnh
 * KHÔNG lưu lại (chỉ nằm trong RAM lúc gọi Gemini); kết quả tách thành từ
 * của từ điển Hanni (Hán Việt, nghĩa, audio, cấp HSK) để lưu vào ôn tập.
 */
@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly genAI: GoogleGenAI | null;
  private readonly cutoffHour: number;
  private index: Map<string, ScanWord> | null = null;
  private indexAt = 0;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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

  async scan(userId: string, file: Express.Multer.File) {
    if (!SCAN_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ nhận ảnh JPG, PNG, WEBP hoặc HEIC');
    }
    if (!this.genAI) {
      throw new BadRequestException(
        'Quét ảnh chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
      );
    }

    const { key, limit, premium } = await this.quotaOf(userId);
    let used = await this.redis.client.incr(key);
    if (used === 1) await this.redis.client.expire(key, QUOTA_TTL_SEC);
    if (used > limit) {
      await this.redis.client.decr(key);
      throw new ForbiddenException(
        premium
          ? `Hôm nay bạn đã quét đủ ${limit} ảnh — mai quét tiếp nhé.`
          : `Bạn đã dùng hết ${limit} lượt quét ảnh miễn phí hôm nay. Nâng cấp Premium để quét ${PREMIUM_SCAN_DAILY_LIMIT} ảnh mỗi ngày.`,
      );
    }

    const parsed = await this.read(file);
    // Đọc lỗi, hoặc ảnh không có chữ Hán/đồ vật nào: không tính lượt.
    if (!parsed?.lines.length && !parsed?.objects.length)
      used = await this.redis.client.decr(key);
    if (!parsed) {
      throw new ServiceUnavailableException(
        'Chưa đọc được ảnh lúc này, thử lại sau ít phút nhé.',
      );
    }

    const index = await this.wordIndex();
    const found = new Map<string, ScanWord>();
    const tokenize = (l: ScanLine) => ({
      zh: l.zh,
      vi: l.vi,
      tokens: segmentLine(l.zh, index).map((t) => {
        if (t.word) found.set(t.word.id, t.word);
        return {
          text: t.text,
          wordId: t.word?.id ?? null,
          // Đoạn ngoài từ điển (tên riêng, từ hiếm) vẫn có pinyin để đọc.
          pinyin:
            t.word?.pinyin ??
            (hasHan(t.text)
              ? pinyin(t.text, { toneType: 'symbol', nonZh: 'removed' })
              : null),
        };
      }),
    });
    const lines = parsed.lines.map(tokenize);
    const objects = parsed.objects.map(tokenize);

    const ids = [...found.keys()];
    const saved = new Set(
      ids.length
        ? (
            await this.prisma.userWordProgress.findMany({
              where: { userId, wordId: { in: ids } },
              select: { wordId: true },
            })
          ).map((p) => p.wordId)
        : [],
    );
    return {
      kind: parsed.kind,
      lines,
      objects,
      words: [...found.values()].map((w) => ({
        ...w,
        familiar: hanVietMatchesMeaning(w),
        saved: saved.has(w.id),
      })),
      usage: { used: Math.min(used, limit), limit, premium },
    };
  }

  private async read(file: Express.Multer.File): Promise<ScanJson | null> {
    const image = {
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    };
    for (const model of CHAT_MODELS) {
      try {
        const response = await this.genAI!.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [image, { text: SCAN_PROMPT }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: SCAN_SCHEMA,
          },
        });
        const parsed = response.text ? parseScanJson(response.text) : null;
        if (parsed) return parsed;
      } catch (err) {
        this.logger.warn(
          `[Scan] model ${model} lỗi: ${(err as Error).message}`,
        );
      }
    }
    return null;
  }

  private async quotaOf(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { premiumUntil: true, timezone: true },
    });
    const premium = isPremiumActive(user.premiumUntil);
    const day = localStudyDate(new Date(), user.timezone, this.cutoffHour);
    return {
      key: `scan:${userId}:${day}`,
      limit: premium ? PREMIUM_SCAN_DAILY_LIMIT : FREE_SCAN_DAILY_LIMIT,
      premium,
    };
  }

  /** Cache trong tiến trình như phụ đề video (`VideosService`) — bảng từ ít
   * đổi. Khớp cả dạng phồn thể (thực đơn, biển hiệu Đài Loan/Hồng Kông),
   * dạng giản thể được ưu tiên khi trùng; từ đồng tự khác âm giữ dòng cấp
   * thấp, thông dụng hơn. */
  private async wordIndex(): Promise<Map<string, ScanWord>> {
    if (this.index && Date.now() - this.indexAt < 3_600_000) return this.index;
    const words = await this.prisma.word.findMany({
      select: {
        id: true,
        simplified: true,
        traditional: true,
        pinyin: true,
        hanViet: true,
        meaningVi: true,
        hskLevel: true,
        audioUrl: true,
      },
      orderBy: [
        { hskLevel: 'asc' },
        { frequencyRank: { sort: 'asc', nulls: 'last' } },
      ],
    });
    const index = new Map<string, ScanWord>();
    for (const w of words)
      if (!index.has(w.simplified)) index.set(w.simplified, w);
    for (const w of words)
      if (w.traditional && !index.has(w.traditional))
        index.set(w.traditional, w);
    this.index = index;
    this.indexAt = Date.now();
    return index;
  }
}
