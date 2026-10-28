import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleGenAI } from '@google/genai';
import { pinyin } from 'pinyin-pro';
import { In, Repository } from 'typeorm';
import type { Env } from '../../config/env.validation';
import { UserWordProgress, Word } from '../../database/entities';
import { DailyQuotaService } from '../../infra/redis/daily-quota.service';
import { CHAT_MODELS } from '../assistant/gemini-models';
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
const SCAN_QUOTA = {
  name: 'scan',
  free: FREE_SCAN_DAILY_LIMIT,
  premium: PREMIUM_SCAN_DAILY_LIMIT,
};

/**
 * Quét ảnh (OCR + nhận diện đồ vật) bằng Gemini — xem `SCAN_PROMPT`. Ảnh
 * KHÔNG lưu lại (chỉ nằm trong RAM lúc gọi Gemini); kết quả tách thành từ
 * của từ điển Hanni (Hán Việt, nghĩa, audio, cấp HSK) để lưu vào ôn tập.
 */
@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly genAI: GoogleGenAI | null;
  private index: Map<string, ScanWord> | null = null;
  private indexAt = 0;

  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(UserWordProgress)
    private readonly progress: Repository<UserWordProgress>,
    private readonly quota: DailyQuotaService,
  ) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async usage(userId: string) {
    const q = await this.quota.peek(userId, SCAN_QUOTA);
    return { ...q, enabled: !!this.genAI };
  }

  async scan(userId: string, file: Express.Multer.File) {
    if (!SCAN_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ nhận ảnh JPG, PNG, WEBP hoặc HEIC');
    }
    if (!this.genAI) {
      throw new BadRequestException(
        'Quét ảnh đang tạm đóng — thử lại sau nhé.',
      );
    }

    const q = await this.quota.take(userId, SCAN_QUOTA);
    if (!q.ok) {
      throw new ForbiddenException(
        q.premium
          ? `Hôm nay bạn đã quét đủ ${q.limit} ảnh — mai quét tiếp nhé.`
          : `Bạn đã dùng hết ${q.limit} lượt quét ảnh miễn phí hôm nay. Nâng cấp Premium để quét ${PREMIUM_SCAN_DAILY_LIMIT} ảnh mỗi ngày.`,
      );
    }
    let { used } = q;
    const { limit, premium } = q;

    const parsed = await this.read(file);
    // Đọc lỗi, hoặc ảnh không có chữ Hán/đồ vật nào: không tính lượt.
    if (!parsed?.lines.length && !parsed?.objects.length) {
      await this.quota.refund(userId, SCAN_QUOTA);
      used -= 1;
    }
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
            await this.progress.find({
              where: { userId, wordId: In(ids) },
              select: { id: true, wordId: true },
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

  /** Cache trong tiến trình như phụ đề video (`VideosService`) — bảng từ ít
   * đổi. Khớp cả dạng phồn thể (thực đơn, biển hiệu Đài Loan/Hồng Kông),
   * dạng giản thể được ưu tiên khi trùng; từ đồng tự khác âm giữ dòng cấp
   * thấp, thông dụng hơn. */
  private async wordIndex(): Promise<Map<string, ScanWord>> {
    if (this.index && Date.now() - this.indexAt < 3_600_000) return this.index;
    const words = await this.words.find({
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
      order: {
        hskLevel: 'ASC',
        frequencyRank: { direction: 'ASC', nulls: 'LAST' },
      },
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
