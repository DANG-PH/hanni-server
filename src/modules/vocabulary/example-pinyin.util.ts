import { rubyOf, type PinyinOverrides } from '../mock-exams/mock-exam.content';

/** Bảng đọc lấy từ từ điển Hanni: từ/chữ có ĐÚNG 1 cách đọc → âm từng chữ (cùng cách
 * `MockExamsService` dựng cho đề thi thử). */
export function pinyinOverrides(
  words: { simplified: string; pinyin: string }[],
): PinyinOverrides {
  const readings = new Map<string, Set<string>>();
  for (const w of words)
    readings.set(
      w.simplified,
      (readings.get(w.simplified) ?? new Set()).add(w.pinyin),
    );
  const out: PinyinOverrides = new Map();
  for (const [simplified, set] of readings) {
    if (set.size !== 1) continue;
    const syllables = [...set][0].split(/\s+/).filter(Boolean);
    if (syllables.length === Array.from(simplified).length)
      out.set(simplified, syllables);
  }
  return out;
}

const PUNCT: Record<string, string> = {
  '，': ', ',
  '、': ', ',
  '。': '.',
  '？': '?',
  '！': '!',
  '：': ': ',
  '；': '; ',
};

/**
 * Pinyin cả câu cho câu ví dụ. Dùng `rubyOf` của đề thi thử (từ điển Hanni + luật 得/着/
 * 只/儿 hoá) thay cho `pinyin-pro` thuần: thuần thì 说得很好 ra "shuō dé", 裤子 "kù zǐ",
 * 哪儿 "nǎ ér", 谢谢 "xiè xiè". 儿 hoá ghép liền âm trước ("diǎnr"). Thanh gốc, không biến
 * điệu 一/不 — cùng quy ước với đề thi thử và từ điển.
 */
export function examplePinyin(zh: string, overrides: PinyinOverrides): string {
  const { py } = rubyOf(zh, overrides);
  let out = '';
  Array.from(zh).forEach((c, i) => {
    const s = py[i];
    if (!s) {
      out += PUNCT[c] ?? c;
      return;
    }
    if (s === 'r' && /\p{L}$/u.test(out)) {
      out += 'r';
      return;
    }
    out += (out && !/[\s“‘(]$/u.test(out) ? ' ' : '') + s;
  });
  return out
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,?!:;”’)])/g, '$1')
    .trim();
}
