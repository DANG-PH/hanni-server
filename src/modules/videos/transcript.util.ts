import { pinyin } from 'pinyin-pro';

export interface ParsedLine {
  index: number;
  startMs: number | null;
  zh: string;
  pinyin: string;
  pinyinNum: string;
  vi: string | null;
}

/**
 * Bản chép nhập vào, mỗi câu 1 dòng, định dạng:
 *   [mm:ss] 中文句子 | Bản dịch tiếng Việt
 * - Mốc thời gian `[mm:ss]` hoặc `[h:mm:ss]` là tuỳ chọn.
 * - Ngăn cách bản dịch bằng " | " hoặc " — " (tuỳ chọn).
 * Pinyin tự sinh từ phần chữ Hán.
 */
export function parseTranscript(raw: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let rest = trimmed;
    let startMs: number | null = null;
    const tm = /^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*/.exec(rest);
    if (tm) {
      const a = Number(tm[1]);
      const b = Number(tm[2]);
      const c = tm[3] ? Number(tm[3]) : null;
      startMs = (c !== null ? (a * 60 + b) * 60 + c : a * 60 + b) * 1000;
      rest = rest.slice(tm[0].length);
    }

    const sep = rest.search(/\s[|｜—–]\s/);
    let zh = rest;
    let vi: string | null = null;
    if (sep >= 0) {
      zh = rest.slice(0, sep).trim();
      vi = rest.slice(sep + 3).trim() || null;
    }
    if (!zh) continue;

    out.push({
      index: out.length + 1,
      startMs,
      zh,
      pinyin: pinyin(zh, { toneType: 'symbol', nonZh: 'consecutive' }),
      pinyinNum: pinyin(zh, { toneType: 'num', nonZh: 'consecutive' }),
      vi,
    });
  }
  return out;
}
