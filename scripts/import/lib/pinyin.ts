/**
 * Chuyển pinyin số ↔ pinyin dấu thanh, và chuẩn hoá khoá join.
 * CC-CEDICT / CVDICT dùng pinyin số ("ni3 hao3", thanh nhẹ = 5).
 */

const VOWELS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à', 'a'],
  e: ['e', 'ē', 'é', 'ě', 'è', 'e'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù', 'u'],
  'ü': ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

/** Vị trí đặt dấu thanh trong 1 âm tiết (quy tắc a>o>e; iu/ui đặt vào chữ sau). */
function markSyllable(syl: string): string {
  const m = /^([a-zü:]+?)([1-5])$/i.exec(syl.replace('u:', 'ü').toLowerCase());
  if (!m) return syl.replace(/[1-5]$/, '');
  const [, letters, toneStr] = m;
  const tone = Number(toneStr);
  if (tone === 5) return letters;

  let idx = -1;
  if (letters.includes('a')) idx = letters.indexOf('a');
  else if (letters.includes('o')) idx = letters.indexOf('o');
  else if (letters.includes('e')) idx = letters.indexOf('e');
  else {
    const iu = letters.search(/[iuü]/);
    let last = -1;
    for (let i = 0; i < letters.length; i += 1) {
      if ('iuü'.includes(letters[i])) last = i;
    }
    idx = /iu|ui/.test(letters) ? last : iu;
  }
  if (idx < 0) return letters;
  const ch = letters[idx];
  const marked = VOWELS[ch]?.[tone] ?? ch;
  return letters.slice(0, idx) + marked + letters.slice(idx + 1);
}

/** "ni3 hao3" → "nǐ hǎo" */
export function numericToDiacritic(numeric: string): string {
  return numeric
    .trim()
    .split(/\s+/)
    .map(markSyllable)
    .join(' ');
}

/** Khoá join: chữ thường, thanh nhẹ chuẩn hoá về "5", bỏ khoảng trắng thừa, u: → ü. */
export function normalizePinyinKey(numeric: string): string {
  return numeric
    .trim()
    .toLowerCase()
    .replace(/u:/g, 'ü')
    .split(/\s+/)
    .map((s) => (/[1-5]$/.test(s) ? s : `${s}5`))
    .join(' ');
}

/**
 * Bỏ dấu thanh + khoảng trắng + dấu câu → chuỗi chỉ gồm chữ cái thường.
 * Dùng để so khớp cách đọc trong đại cương (dấu thanh, "bàba") với CC-CEDICT
 * ("ba4 ba5") mà không phụ thuộc tách âm tiết. ü/v → "u".
 */
export function stripTones(pinyin: string): string {
  return pinyin
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // dấu thanh + diaeresis
    .replace(/ü/g, 'u')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}
