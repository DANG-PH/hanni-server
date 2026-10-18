/**
 * Tìm từ có XẾP HẠNG cho ô tra từ điển (2026-10-18). Trước đó `GET /words?q=`
 * lọc `contains` trên nhiều cột rồi xếp theo tần suất: gõ "hoc" (không dấu)
 * không khớp "học" mà lại khớp "c-hoc-olate" trong nghĩa tiếng Anh nên 巧克力
 * lên đầu; gõ pinyin liền không dấu ("dianshi") thì không ra gì.
 *
 * Bậc (nhỏ hơn = khớp tốt hơn):
 * 0 trùng mặt chữ · 0.9 trùng CẢ âm Hán Việt lẫn nét nghĩa đầu (时间 "thời gian" trước
 * 时候 nghĩa "thời gian") · 1 trùng âm Hán Việt / pinyin (bỏ dấu, viết liền) / nét nghĩa
 * đầu, bỏ chú thích trong ngoặc ("xin chao" → 你好 cùng bậc với 新潮 xīncháo, cấp thấp
 * lên trước) ·
 * 1.5 pinyin gõ "u" cho ü (lu → 绿, sau 路) ·
 * 2 bắt đầu bằng chuỗi gõ · 3 trùng TRỌN 1 từ trong nghĩa tiếng Việt (bỏ dấu) ·
 * 4 chứa trong âm Hán Việt / mặt chữ · 5 chứa trong pinyin / nghĩa tiếng Việt ·
 * 6 trùng trọn từ trong nghĩa tiếng Anh · 7 chứa trong nghĩa tiếng Anh.
 *
 * Gõ CÓ dấu thì âm Hán Việt / nghĩa tiếng Việt so cả dấu ("học" không ra 空洞 "hốc");
 * gõ 1 âm tiết KHÔNG dấu thì không xếp nghĩa nguyên văn lên bậc 1 — "hoc" có thể là
 * học/hốc/hóc, 空洞 "hốc" từng đứng trước 学校.
 *
 * Cụm nhiều từ không trùng mục nào ("ăn cơm" — HSK 3.0 không có 吃饭) thì xếp theo số
 * phần khớp trong nghĩa (bậc 8–9): ra 吃 "ăn", 饭 "cơm" thay vì trang trống.
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
  /** âm Hán Việt / nghĩa tiếng Việt chữ thường, GIỮ dấu */
  hvA: string;
  viA: string;
  /** nét nghĩa đầu (trước dấu ";"), bỏ chú thích trong ngoặc — bỏ dấu / giữ dấu */
  vi1: string;
  vi1A: string;
  /** nghĩa tiếng Anh viết thường */
  en: string;
}

export interface SearchQuery {
  raw: string;
  han: boolean;
  folded: string;
  compact: string;
  /** người dùng gõ có dấu (tiếng Việt hoặc dấu thanh pinyin) */
  accented: boolean;
  lowerA: string;
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

/** Chữ thường, GIỮ dấu (NFC), gộp khoảng trắng. */
export function lowerKeepAccents(s: string): string {
  return s.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function compactPinyin(pinyinNumeric: string): string {
  return fold(pinyinNumeric.replace(/u:/g, 'v').replace(/ü/g, 'v')).replace(
    /[^a-z]/g,
    '',
  );
}

/** Nét nghĩa đầu, bỏ chú thích trong ngoặc: "(khái niệm) thời gian; lúc" → "thời gian". */
function firstSense(meaning: string): string {
  let depth = 0;
  let end = meaning.length;
  for (let i = 0; i < meaning.length; i++) {
    const c = meaning[i];
    if (c === '(' || c === '（') depth++;
    else if ((c === ')' || c === '）') && depth > 0) depth--;
    else if (c === ';' && depth === 0) {
      end = i;
      break;
    }
  }
  return meaning.slice(0, end).replace(/[(（][^)）]*[)）]/g, ' ');
}

/** Dòng tìm kiếm từ cột của bảng `Word`. */
export function toSearchRow(w: {
  id: string;
  simplified: string;
  traditional: string | null;
  hskLevel: number;
  frequencyRank: number | null;
  pinyinNumeric: string;
  hanViet: string | null;
  meaningVi: string | null;
  meaningEn: string | null;
}): SearchRow {
  const vi = w.meaningVi ?? '';
  return {
    id: w.id,
    simplified: w.simplified,
    traditional: w.traditional,
    hskLevel: w.hskLevel,
    frequencyRank: w.frequencyRank,
    py: compactPinyin(w.pinyinNumeric),
    hv: fold(w.hanViet ?? ''),
    vi: fold(vi),
    hvA: lowerKeepAccents(w.hanViet ?? ''),
    viA: lowerKeepAccents(vi),
    vi1: fold(firstSense(vi)),
    vi1A: lowerKeepAccents(firstSense(vi)),
    en: (w.meaningEn ?? '').toLowerCase(),
  };
}

export function prepareQuery(q: string): SearchQuery {
  const raw = q.trim();
  const folded = fold(raw);
  const lowerA = lowerKeepAccents(raw);
  return {
    raw,
    han: /\p{Script=Han}/u.test(raw),
    folded,
    compact: folded.replace(/[^a-z]/g, ''),
    accented: lowerA !== folded,
    lowerA,
  };
}

/** `text` có chứa `phrase` như 1 cụm từ trọn vẹn (không cắt giữa chữ). */
function hasWord(text: string, phrase: string): boolean {
  if (!phrase) return false;
  const words = ` ${text.replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return words.includes(` ${phrase.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `);
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
  const t = q.accented ? q.lowerA : q.folded;
  const hv = q.accented ? row.hvA : row.hv;
  const vi = q.accented ? row.viA : row.vi;
  const vi1 = q.accented ? row.vi1A : row.vi1;
  if (hv === t && vi1 === t) return 0.9;
  if (
    hv === t ||
    (q.compact && row.py === q.compact) ||
    (vi1 === t && (q.accented || t.includes(' ')))
  )
    return 1;
  if (q.compact && row.py.replace(/v/g, 'u') === q.compact) return 1.5;
  if (hv.startsWith(`${t} `)) return 2;
  if (q.compact.length >= 2 && row.py.startsWith(q.compact)) return 2;
  if (hasWord(vi, t)) return 3;
  if (hv.includes(t)) return 4;
  if (q.compact.length >= 3 && row.py.includes(q.compact)) return 5;
  if (vi.includes(t)) return 5;
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
  if (scored.length === 0 && !q.han && q.folded.includes(' ')) {
    const parts = (q.accented ? q.lowerA : q.folded).split(' ');
    for (const row of rows) {
      if (level && row.hskLevel !== level) continue;
      const vi = q.accented ? row.viA : row.vi;
      const hit = parts.filter((p) => hasWord(vi, p)).length;
      if (hit === 0) continue;
      const exact = parts.includes(q.accented ? row.vi1A : row.vi1);
      scored.push([9 - hit / parts.length - (exact ? 0.6 : 0), row]);
    }
  }
  scored.sort(
    (a, b) =>
      a[0] - b[0] ||
      a[1].hskLevel - b[1].hskLevel ||
      (a[1].frequencyRank ?? 1e9) - (b[1].frequencyRank ?? 1e9),
  );
  return scored.map(([, row]) => row);
}
