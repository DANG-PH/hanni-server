import { Injectable } from '@nestjs/common';
import { convert } from 'pinyin-pro';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  PREDICTED_TONE,
  TONE_RULE_KEYS,
  toneHintsOf,
  type ToneRuleKey,
} from '../hanviet/tone-rule.util';

type Tone = 1 | 2 | 3 | 4;

export interface SyllableSound {
  char: string;
  mark: string;
  url: string;
}

export interface PinyinOverview {
  /** Âm tiết gốc (không thanh) → tối đa 4 thanh có ghi âm thật. */
  syllables: { base: string; tones: Partial<Record<Tone, SyllableSound>> }[];
  /** Quy luật Hán Việt → thanh tiếng Trung, kèm tỉ lệ đúng ĐO TRÊN bộ từ Hanni. */
  toneRules: {
    key: ToneRuleKey;
    predicted: Tone | null;
    total: number;
    follows: number;
    examples: {
      char: string;
      hanViet: string;
      mark: string;
      url: string | null;
    }[];
  }[];
}

/** Đo tỉ lệ quy luật trên HSK 1–4 — nhóm từ người mới thật sự gặp. */
const RULE_MAX_LEVEL = 4;
const EXAMPLES_PER_RULE = 4;
const SINGLE = /^([a-zü]+)([1-4])$/;

/**
 * Dữ liệu cho trang Bảng phiên âm (`/phien-am`): âm thanh từng âm tiết lấy từ
 * ghi âm thật của CHỮ ĐƠN trong từ điển (八 → bā). Bỏ chữ có nhiều cách đọc
 * (好 hǎo/hào): file ghi âm đặt theo mặt chữ (`cmn-好.mp3`), không biết đọc
 * âm nào. Nội dung tĩnh theo dữ liệu từ điển nên dựng 1 lần rồi cache.
 */
@Injectable()
export class PinyinService {
  private cache?: Promise<PinyinOverview>;

  constructor(private readonly prisma: PrismaService) {}

  overview() {
    this.cache ??= this.build().catch((err: unknown) => {
      this.cache = undefined;
      throw err;
    });
    return this.cache;
  }

  private async build(): Promise<PinyinOverview> {
    const words = await this.prisma.word.findMany({
      select: {
        simplified: true,
        pinyinNumeric: true,
        hanViet: true,
        audioUrl: true,
        hskLevel: true,
        frequencyRank: true,
      },
      orderBy: [{ hskLevel: 'asc' }, { frequencyRank: 'asc' }],
    });

    const readings = new Map<string, Set<string>>();
    for (const w of words)
      readings.set(
        w.simplified,
        (readings.get(w.simplified) ?? new Set()).add(w.pinyinNumeric.trim()),
      );
    /** Ghi âm của chữ đơn chỉ có 1 cách đọc — `null` nếu không dùng được. */
    const soundOf = (w: (typeof words)[number]) =>
      w.audioUrl &&
      Array.from(w.simplified).length === 1 &&
      readings.get(w.simplified)?.size === 1
        ? w.audioUrl
        : null;

    const byBase = new Map<string, Partial<Record<Tone, SyllableSound>>>();
    for (const w of words) {
      const m = SINGLE.exec(w.pinyinNumeric.trim());
      const url = soundOf(w);
      if (!m || !url) continue;
      const [, base, t] = m;
      const tone = Number(t) as Tone;
      const tones = byBase.get(base) ?? {};
      // `words` đã sắp cấp thấp + thông dụng trước → giữ chữ đầu tiên gặp.
      tones[tone] ??= {
        char: w.simplified,
        mark: convert(`${base}${tone}`, { format: 'numToSymbol' }),
        url,
      };
      byBase.set(base, tones);
    }

    const stats = new Map(
      TONE_RULE_KEYS.map((key) => [
        key,
        {
          total: 0,
          follows: 0,
          examples: [] as PinyinOverview['toneRules'][number]['examples'],
        },
      ]),
    );
    for (const w of words) {
      if (w.hskLevel > RULE_MAX_LEVEL) continue;
      for (const h of toneHintsOf(w) ?? []) {
        if (h.tone === 5) continue;
        const s = stats.get(h.rule)!;
        s.total += 1;
        if (h.follows) s.follows += 1;
        // Ví dụ: chữ ĐƠN theo đúng quy luật (quy luật không đoán thì lấy chữ
        // bất kỳ để minh hoạ sự phân tán), ưu tiên chữ có ghi âm.
        const single = Array.from(w.simplified).length === 1;
        if (
          single &&
          (h.follows || PREDICTED_TONE[h.rule] === null) &&
          s.examples.length < EXAMPLES_PER_RULE &&
          !s.examples.some((e) => e.char === h.char)
        )
          s.examples.push({
            char: h.char,
            hanViet: h.hanViet,
            mark: convert(w.pinyinNumeric.trim(), { format: 'numToSymbol' }),
            url: soundOf(w),
          });
      }
    }

    return {
      syllables: [...byBase.entries()]
        .map(([base, tones]) => ({ base, tones }))
        .sort((a, b) => a.base.localeCompare(b.base)),
      toneRules: TONE_RULE_KEYS.map((key) => ({
        key,
        predicted: PREDICTED_TONE[key],
        ...stats.get(key)!,
      })),
    };
  }
}
