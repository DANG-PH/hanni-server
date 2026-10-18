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

/** Mục chỉ là dạng BIẾN THỂ/tham chiếu: nghĩa đầu là "biến thể của X"/"xem X", HOẶC
 * có nghĩa "biến thể (cũ) của X" mà X là chính chữ giản thể / dạng phồn thể của mục khác
 * cùng nhóm (秊 年 "…/biến thể của 年", 鱻 鲜 "cá/biến thể cũ của 鮮|鲜"). Mục chính
 * như 辭 辞 cũng có "biến thể của 詞|词" — trỏ sang chữ KHÁC nhóm nên không tính. */
export function isVariantEntry(
  e: CedictEntry,
  group: CedictEntry[] = [],
): boolean {
  if (/^(biến thể|xem\s)/i.test(e.defs[0]?.trim() ?? '')) return true;
  const forms = new Set([
    e.simplified,
    ...group.filter((g) => g !== e).map((g) => g.traditional),
  ]);
  forms.delete(e.traditional);
  return e.defs.some((d) => {
    const m = /biến thể(?: cũ)? của ([^\s|[/]+)/i.exec(d);
    return m !== null && forms.has(m[1]);
  });
}

/** MỌI mục theo "simplified|pinyinKey" — `indexCedict` chỉ giữ 1 mục mỗi khoá. */
export function groupCedict(
  entries: CedictEntry[],
): Map<string, CedictEntry[]> {
  const map = new Map<string, CedictEntry[]>();
  for (const e of entries) {
    const key = `${e.simplified}|${e.pinyinKey}`;
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return map;
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
