/**
 * Tách 1 dòng phụ đề tiếng Trung thành các "token" — đoạn khớp với 1 từ vựng
 * thật trong `Word` (để bấm vào xem nghĩa + lưu vào SRS khi xem video) hoặc
 * đoạn KHÔNG khớp (giữ nguyên, không bấm được). Dùng thuật toán khớp dài nhất
 * trước (greedy longest-match) trên bảng từ có sẵn thay vì 1 bộ tách từ tiếng
 * Trung tổng quát — mỗi đoạn khớp được đảm bảo trỏ thẳng tới 1 dòng từ điển
 * thật (có nghĩa tiếng Việt + cấp HSK), không cần đoán.
 */

export interface WordMatch {
  id: string;
  pinyin: string;
  meaningVi: string | null;
  hskLevel: number;
  imageUrl: string | null;
}

export interface LineToken {
  text: string;
  word: WordMatch | null;
}

const MAX_WORD_CHARS = 6;

export function buildWordIndex<T extends { simplified: string } & WordMatch>(
  words: T[],
): Map<string, WordMatch> {
  const index = new Map<string, WordMatch>();
  for (const w of words) {
    // Nếu trùng simplified (đồng tự khác âm), giữ dòng có frequencyRank thấp
    // hơn/tới trước — đơn giản nhất: giữ dòng ĐẦU TIÊN gặp, đủ dùng cho việc
    // gợi ý nghĩa lúc xem video (không cần phân biệt âm đọc chính xác ở đây).
    if (!index.has(w.simplified)) {
      index.set(w.simplified, {
        id: w.id,
        pinyin: w.pinyin,
        meaningVi: w.meaningVi,
        hskLevel: w.hskLevel,
        imageUrl: w.imageUrl,
      });
    }
  }
  return index;
}

export function segmentLine(
  zh: string,
  index: Map<string, WordMatch>,
): LineToken[] {
  const chars = Array.from(zh);
  const tokens: LineToken[] = [];
  let i = 0;
  let plain = '';

  const flushPlain = () => {
    if (plain) {
      tokens.push({ text: plain, word: null });
      plain = '';
    }
  };

  while (i < chars.length) {
    let matched: { text: string; word: WordMatch } | null = null;
    const maxLen = Math.min(MAX_WORD_CHARS, chars.length - i);
    for (let len = maxLen; len >= 1; len -= 1) {
      const candidate = chars.slice(i, i + len).join('');
      const word = index.get(candidate);
      if (word) {
        matched = { text: candidate, word };
        break;
      }
    }
    if (matched) {
      flushPlain();
      tokens.push({ text: matched.text, word: matched.word });
      i += Array.from(matched.text).length;
    } else {
      plain += chars[i];
      i += 1;
    }
  }
  flushPlain();
  return tokens;
}
