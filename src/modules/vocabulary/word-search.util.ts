/**
 * Tìm từ có XẾP HẠNG cho ô tra từ điển (2026-10-18). Trước đó `GET /words?q=`
 * lọc `contains` trên nhiều cột rồi xếp theo tần suất: gõ "hoc" (không dấu)
 * không khớp "học" mà lại khớp "c-hoc-olate" trong nghĩa tiếng Anh nên 巧克力
 * lên đầu; gõ pinyin liền không dấu ("dianshi") thì không ra gì.
 *
 * Bậc (nhỏ hơn = khớp tốt hơn):
 * 0 trùng mặt chữ · 1 trùng âm Hán Việt / pinyin (bỏ dấu, viết liền) / nghĩa tiếng
 * Việt nguyên văn ("xin chao" → 你好 cùng bậc với 新潮 xīncháo, cấp thấp lên trước) ·
 * 1.5 pinyin gõ "u" cho ü (lu → 绿, sau 路) ·
 * 2 bắt đầu bằng chuỗi gõ · 3 trùng TRỌN 1 từ trong nghĩa tiếng Việt (bỏ dấu) ·
 * 4 chứa trong âm Hán Việt / mặt chữ · 5 chứa trong pinyin / nghĩa tiếng Việt ·
 * 6 trùng trọn từ trong nghĩa tiếng Anh · 7 chứa trong nghĩa tiếng Anh.
 */

export interface SearchRow {
  id: string;
  simplified: string;
  traditional: string | null;
  hskLevel: number;
  frequencyRank: number | null;
  /** pinyin bỏ dấu + số + khoảng trắng: "dian4 shi4" → "dianshi" (ü → v như bộ gõ) */
  py: string;
  /** âm Hán Việt bỏ dấu */
  hv: string;
  /** nghĩa tiếng Việt bỏ dấu */
  vi: string;
  /** nghĩa tiếng Anh viết thường */
  en: string;
}

export interface SearchQuery {
  raw: string;
  han: boolean;
  folded: string;
  compact: string;
}

/** Chữ thường, bỏ dấu tiếng Việt / dấu thanh pinyin, đ → d, gộp khoảng trắng. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactPinyin(pinyinNumeric: string): string {
  return fold(pinyinNumeric.replace(/u:/g, 'v').replace(/ü/g, 'v')).replace(
    /[^a-z]/g,
    '',
  );
}

export function prepareQuery(q: string): SearchQuery {
  const raw = q.trim();
  const folded = fold(raw);
  return {
    raw,
    han: /\p{Script=Han}/u.test(raw),
    folded,
    compact: folded.replace(/[^a-z]/g, ''),
  };
}

/** `text` có chứa `phrase` như 1 cụm từ trọn vẹn (không cắt giữa chữ). */
function hasWord(text: string, phrase: string): boolean {
  if (!phrase) return false;
  const words = ` ${text.replace(/[^a-z0-9]+/g, ' ')} `;
  return words.includes(` ${phrase.replace(/[^a-z0-9]+/g, ' ').trim()} `);
}

export function scoreWord(row: SearchRow, q: SearchQuery): number | null {
  if (q.han) {
    if (row.simplified === q.raw || row.traditional === q.raw) return 0;
    if (row.simplified.startsWith(q.raw) || row.traditional?.startsWith(q.raw))
      return 2;
    if (row.simplified.includes(q.raw) || row.traditional?.includes(q.raw))
      return 4;
    return null;
  }
  if (!q.folded) return null;
  if (row.hv === q.folded || (q.compact && row.py === q.compact)) return 1;
  if (row.vi === q.folded || row.vi.startsWith(`${q.folded};`)) return 1;
  if (q.compact && row.py.replace(/v/g, 'u') === q.compact) return 1.5;
  if (row.hv.startsWith(`${q.folded} `)) return 2;
  if (q.compact.length >= 2 && row.py.startsWith(q.compact)) return 2;
  if (hasWord(row.vi, q.folded)) return 3;
  if (row.hv.includes(q.folded)) return 4;
  if (q.compact.length >= 3 && row.py.includes(q.compact)) return 5;
  if (row.vi.includes(q.folded)) return 5;
  const lower = q.raw.toLowerCase();
  if (hasWord(row.en, lower)) return 6;
  if (row.en.includes(lower)) return 7;
  return null;
}

/** Lọc + xếp: bậc khớp, rồi cấp HSK thấp trước, rồi từ thông dụng trước. */
export function rankWords(
  rows: SearchRow[],
  q: SearchQuery,
  level?: number,
): SearchRow[] {
  const scored: [number, SearchRow][] = [];
  for (const row of rows) {
    if (level && row.hskLevel !== level) continue;
    const s = scoreWord(row, q);
    if (s !== null) scored.push([s, row]);
  }
  scored.sort(
    (a, b) =>
      a[0] - b[0] ||
      a[1].hskLevel - b[1].hskLevel ||
      (a[1].frequencyRank ?? 1e9) - (b[1].frequencyRank ?? 1e9),
  );
  return scored.map(([, row]) => row);
}
