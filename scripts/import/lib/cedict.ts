import { normalizePinyinKey } from './pinyin';

/**
 * Parser dòng CC-CEDICT / CVDICT (.u8). Cùng định dạng:
 *   繁體 简体 [pin1 yin1] /nghĩa 1/nghĩa 2/
 */
export interface CedictEntry {
  traditional: string;
  simplified: string;
  pinyinNumeric: string; // như file gốc (space, có thể có u:)
  pinyinKey: string; // đã normalizePinyinKey
  defs: string[];
}

const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/;

export function parseCedict(content: string): CedictEntry[] {
  const out: CedictEntry[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const [, traditional, simplified, pinyin, defBlock] = m;
    out.push({
      traditional,
      simplified,
      pinyinNumeric: pinyin,
      pinyinKey: normalizePinyinKey(pinyin),
      defs: defBlock.split('/').filter(Boolean),
    });
  }
  return out;
}

/** Index theo "simplified|pinyinKey" (và cả traditional) để join nhanh. */
export function indexCedict(entries: CedictEntry[]): Map<string, CedictEntry> {
  const map = new Map<string, CedictEntry>();
  for (const e of entries) {
    map.set(`${e.simplified}|${e.pinyinKey}`, e);
    map.set(`${e.traditional}|${e.pinyinKey}`, e);
    if (!map.has(e.simplified)) map.set(e.simplified, e); // fallback bỏ pinyin
  }
  return map;
}
