import { Type } from '@google/genai';

/**
 * Tiện ích AI gắn vào luồng học (2026-10-18): mẹo nhớ theo âm Hán Việt, chấm câu
 * tự đặt, phân tích/dịch câu ở ô tra từ điển. Dùng CHUNG 1 bộ đếm lượt/ngày (khoá
 * Gemini đang ở gói miễn phí, xem hanni-server/CLAUDE.md) — mẹo nhớ đã có sẵn và
 * câu đã phân tích/chấm rồi lấy từ bộ nhớ đệm, không tính lượt.
 */
export const FREE_AI_TOOLS_DAILY_LIMIT = 10;
export const PREMIUM_AI_TOOLS_DAILY_LIMIT = 200;
export const SENTENCE_MAX = 120;
/** Đổi prompt thì tăng số này — khoá bộ nhớ đệm đổi theo, không trả kết quả của prompt cũ. */
export const PROMPT_VERSION = 2;
export const ANALYZE_MAX = 200;

const HAN = /\p{Script=Han}/u;
export const hasHan = (s: string) => HAN.test(s);

export interface CharFact {
  char: string;
  hanViet: string | null;
  meaningVi: string | null;
}

export interface WordFacts {
  simplified: string;
  pinyin: string;
  hanViet: string | null;
  meaningVi: string | null;
  hskLevel: number;
  chars: CharFact[];
}

/** Chuẩn hoá câu để làm khoá bộ nhớ đệm: bỏ khoảng trắng thừa, dấu câu cuối. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。.!！?？,，;；]+$/u, '');
}

const strip = (s: string) =>
  s
    .replace(/\*\*?|__|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const raw: unknown = JSON.parse(text);
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? strip(v).slice(0, max) : null;

// ───────────────────────── Mẹo nhớ ─────────────────────────

export function mnemonicPrompt(w: WordFacts): string {
  const chars = w.chars.length
    ? w.chars
        .map(
          (c) =>
            `${c.char} = ${c.hanViet ?? '(chưa rõ âm)'}${c.meaningVi ? ` (nghĩa riêng: ${c.meaningVi.split(';')[0]})` : ''}`,
        )
        .join('; ')
    : '(từ 1 chữ)';
  return [
    'Bạn là giáo viên tiếng Trung cho người Việt. Viết MẸO NHỚ cho từ dưới đây trong 1–2 câu (tối đa 50 từ), dựa vào âm Hán Việt và nghĩa từng chữ ĐÃ CHO.',
    '- Chỉ dùng âm Hán Việt và nghĩa đã cho; không tự thêm âm hay nghĩa khác.',
    '- Âm Hán Việt trùng hoặc gần nghĩa tiếng Việt (vd 时间 "thời gian") thì nói thẳng điều đó.',
    '- Ghép nghĩa từng chữ ra được nghĩa cả từ thì chỉ ra (vd 电脑 = điện + não → "bộ não chạy bằng điện" = máy tính).',
    '- Có thể thêm 1 hình ảnh dễ nhớ, nhưng không kể chuyện dài dòng, không dùng markdown.',
    '',
    `Từ: ${w.simplified} (${w.pinyin}) — HSK ${w.hskLevel >= 7 ? '7–9' : w.hskLevel}`,
    `Nghĩa: ${w.meaningVi ?? '(chưa có)'}`,
    `Âm Hán Việt: ${w.hanViet ?? '(chưa có)'}`,
    `Từng chữ: ${chars}`,
    'Trả JSON {"mnemonic": "..."}',
  ].join('\n');
}

export const MNEMONIC_SCHEMA = {
  type: Type.OBJECT,
  properties: { mnemonic: { type: Type.STRING } },
  required: ['mnemonic'],
};

export function parseMnemonic(text: string): string | null {
  const o = parseObject(text);
  const m = o ? str(o.mnemonic, 400) : null;
  return m && m.length >= 15 ? m : null;
}

// ───────────────────────── Chấm câu tự đặt ─────────────────────────

export interface SentenceCheck {
  score: number;
  usesWord: boolean;
  corrected: string;
  pinyin: string;
  translationVi: string;
  explanationVi: string;
  tipVi: string | null;
}

export function sentenceCheckPrompt(w: WordFacts, sentence: string): string {
  return [
    `Bạn là giáo viên tiếng Trung chấm câu cho học viên người Việt (đang học HSK ${w.hskLevel >= 7 ? '7–9' : w.hskLevel}).`,
    `Học viên đặt câu với từ "${w.simplified}" (${w.pinyin}) — nghĩa: ${w.meaningVi ?? '(chưa có)'}.`,
    `Câu của học viên: «${sentence}»`,
    '',
    `Chấm theo: (1) ngữ pháp, (2) dùng "${w.simplified}" đúng nghĩa và đúng vị trí, (3) câu có tự nhiên không.`,
    'Trả JSON:',
    '- score: số nguyên 0–100 (đúng hoàn toàn và tự nhiên: 90–100; lỗi nhỏ: 60–89; sai ngữ pháp hoặc sai nghĩa: dưới 60)',
    `- usesWord: câu có dùng từ "${w.simplified}" không (true/false)`,
    '- corrected: câu đã sửa, GIỮ ý của học viên (đúng rồi thì chép lại nguyên câu)',
    '- pinyin: pinyin có dấu thanh của câu đã sửa, tách theo từ',
    '- translationVi: nghĩa tiếng Việt của câu đã sửa',
    '- explanationVi: nhận xét bằng tiếng Việt, tối đa 3 câu — chỉ rõ chỗ sai và lý do; câu đúng thì khen 1 điểm cụ thể',
    `- tipVi: 1 mẹo ngắn về cách dùng "${w.simplified}"`,
  ].join('\n');
}

export const SENTENCE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    usesWord: { type: Type.BOOLEAN },
    corrected: { type: Type.STRING },
    pinyin: { type: Type.STRING },
    translationVi: { type: Type.STRING },
    explanationVi: { type: Type.STRING },
    tipVi: { type: Type.STRING },
  },
  required: [
    'score',
    'usesWord',
    'corrected',
    'pinyin',
    'translationVi',
    'explanationVi',
  ],
};

export function parseSentenceCheck(text: string): SentenceCheck | null {
  const o = parseObject(text);
  if (!o) return null;
  const score = Number(o.score);
  const corrected = str(o.corrected, 200);
  const pinyin = str(o.pinyin, 400);
  const translationVi = str(o.translationVi, 300);
  const explanationVi = str(o.explanationVi, 600);
  if (!Number.isFinite(score) || !corrected || !hasHan(corrected)) return null;
  if (!pinyin || !translationVi || !explanationVi) return null;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    usesWord: o.usesWord === true,
    corrected,
    pinyin,
    translationVi,
    explanationVi,
    tipVi: str(o.tipVi, 300),
  };
}

// ───────────────────────── Phân tích / dịch câu ─────────────────────────

export interface Analysis {
  zh: string;
  pinyin: string;
  translationVi: string;
  grammar: { pattern: string; explanationVi: string }[];
  notesVi: string | null;
}

export function analyzePrompt(text: string, source: 'zh' | 'vi'): string {
  const fields = [
    'Trả JSON:',
    source === 'zh'
      ? '- zh: chép lại câu (giản thể; câu viết phồn thể thì chuyển sang giản thể)'
      : '- zh: câu tiếng Trung (giản thể)',
    '- pinyin: pinyin có dấu thanh, tách theo từ',
    source === 'zh'
      ? '- translationVi: bản dịch tiếng Việt tự nhiên'
      : '- translationVi: dịch NGƯỢC câu tiếng Trung đó sang tiếng Việt (để học viên đối chiếu)',
    '- grammar: tối đa 3 CẤU TRÚC ngữ pháp thật trong câu tiếng Trung (không liệt kê từ đơn lẻ), mỗi mục {pattern: cấu trúc ghi bằng chữ Hán + từ TIẾNG VIỆT, không dùng tiếng Anh (vd "Chủ ngữ + 想 + động từ", "Số từ + lượng từ + danh từ", "把 + tân ngữ + động từ"), explanationVi: giải thích ngắn bằng tiếng Việt, gắn với câu này}',
    '- notesVi: 1 câu lưu ý (từ dễ nhầm, sắc thái, cách nói khác) — chuỗi rỗng nếu không có',
  ];
  return [
    source === 'zh'
      ? `Bạn là giáo viên tiếng Trung cho người Việt. Phân tích câu tiếng Trung sau cho học viên: «${text}»`
      : `Bạn là giáo viên tiếng Trung cho người Việt. Dịch câu tiếng Việt sau sang tiếng Trung phổ thông, tự nhiên như người bản xứ nói và dễ hiểu với người học: «${text}»`,
    '',
    ...fields,
  ].join('\n');
}

export const ANALYZE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    zh: { type: Type.STRING },
    pinyin: { type: Type.STRING },
    translationVi: { type: Type.STRING },
    grammar: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pattern: { type: Type.STRING },
          explanationVi: { type: Type.STRING },
        },
        required: ['pattern', 'explanationVi'],
      },
    },
    notesVi: { type: Type.STRING },
  },
  required: ['zh', 'pinyin', 'translationVi', 'grammar'],
};

export function parseAnalysis(text: string): Analysis | null {
  const o = parseObject(text);
  if (!o) return null;
  const zh = str(o.zh, 300);
  const pinyin = str(o.pinyin, 600);
  const translationVi = str(o.translationVi, 400);
  if (!zh || !hasHan(zh) || !pinyin || !translationVi) return null;
  const grammar = (Array.isArray(o.grammar) ? o.grammar : [])
    .map((g: unknown) => {
      const r =
        g && typeof g === 'object' ? (g as Record<string, unknown>) : {};
      const pattern = str(r.pattern, 80);
      const explanationVi = str(r.explanationVi, 400);
      return pattern && explanationVi ? { pattern, explanationVi } : null;
    })
    .filter((g): g is { pattern: string; explanationVi: string } => !!g)
    .slice(0, 3);
  return { zh, pinyin, translationVi, grammar, notesVi: str(o.notesVi, 600) };
}

// ───────────────────────── Bài đọc theo bài học ─────────────────────────

export interface ReadingWord {
  simplified: string;
  pinyin: string;
  meaningVi: string | null;
}

export interface ReadingSentence {
  speaker: 'A' | 'B' | null;
  zh: string;
  vi: string;
}

export interface ReadingDraft {
  title: string;
  sentences: ReadingSentence[];
}

/** Từ cấp 1–3 ít (300/500/1000 từ) nên đưa cả danh sách cho AI chỉ dùng trong đó —
 * cấp cao thì quá dài, chỉ soát lại theo chữ (`outOfLevelChars`). */
export const READING_FULL_LIST_MAX_LEVEL = 3;

export function readingPrompt(input: {
  hskLevel: number;
  lessonTitle: string;
  lessonWords: ReadingWord[];
  allowedWords: string[] | null;
  forbiddenChars: string[];
}): string {
  const lines = [
    `Bạn là giáo viên tiếng Trung cho người Việt. Viết MỘT bài đọc ngắn cho học viên HSK ${input.hskLevel} vừa học xong bài "${input.lessonTitle}".`,
    '- Dạng hội thoại 2 người (speaker "A"/"B") hoặc đoạn văn kể chuyện (speaker rỗng), 6–9 câu, mỗi câu tối đa 22 chữ Hán.',
    '- Dùng NHIỀU NHẤT có thể các từ của bài (ít nhất một nửa), đặt trong tình huống đời thường tự nhiên, câu có nghĩa liền mạch.',
    '- Chỉ chữ Hán giản thể + dấu câu tiếng Trung. KHÔNG dùng tên riêng, số Ả Rập, chữ Latin.',
    `- Từ của bài: ${input.lessonWords.map((w) => `${w.simplified} (${w.meaningVi?.split(';')[0] ?? w.pinyin})`).join(', ')}.`,
  ];
  if (input.allowedWords)
    lines.push(
      `- CHỈ được dùng các từ sau (từ vựng HSK 1–${input.hskLevel}), không dùng từ nào khác: ${input.allowedWords.join('、')}.`,
    );
  else
    lines.push(
      `- Chỉ dùng từ vựng thông dụng không vượt quá HSK ${input.hskLevel}.`,
    );
  if (input.forbiddenChars.length)
    lines.push(
      `- Lần trước bài đọc có chữ vượt cấp — TUYỆT ĐỐI không dùng các chữ: ${input.forbiddenChars.join(' ')}.`,
    );
  lines.push(
    '',
    'Trả JSON: title (tên bài đọc bằng tiếng Việt, ≤ 8 từ), sentences: [{speaker: "A" | "B" | "", zh: câu tiếng Trung, vi: bản dịch tiếng Việt tự nhiên}].',
  );
  return lines.join('\n');
}

export const READING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    sentences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING },
          zh: { type: Type.STRING },
          vi: { type: Type.STRING },
        },
        required: ['zh', 'vi'],
      },
    },
  },
  required: ['title', 'sentences'],
};

export function parseReading(text: string): ReadingDraft | null {
  const o = parseObject(text);
  if (!o) return null;
  const title = str(o.title, 80);
  const sentences = (Array.isArray(o.sentences) ? o.sentences : [])
    .map((s: unknown): ReadingSentence | null => {
      const r =
        s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
      const zh = str(r.zh, 60)?.replace(/\s+/g, '');
      const vi = str(r.vi, 240);
      if (!zh || !hasHan(zh) || !vi) return null;
      const speaker = r.speaker === 'A' || r.speaker === 'B' ? r.speaker : null;
      return { speaker, zh, vi };
    })
    .filter((s): s is ReadingSentence => !!s)
    .slice(0, 10);
  return title && sentences.length >= 4 ? { title, sentences } : null;
}

/** Chữ Hán trong bài đọc mà KHÔNG thuộc từ vựng HSK ≤ cấp bài (khác thứ tự xuất hiện). */
export function outOfLevelChars(
  sentences: { zh: string }[],
  allowed: Set<string>,
): string[] {
  const out = new Set<string>();
  for (const s of sentences)
    for (const c of s.zh) if (HAN.test(c) && !allowed.has(c)) out.add(c);
  return [...out];
}

/** Từ của bài xuất hiện trong bài đọc — hiện "dùng 7/10 từ của bài". */
export function lessonWordsUsed(
  sentences: { zh: string }[],
  words: { simplified: string }[],
): string[] {
  const text = sentences.map((s) => s.zh).join('');
  return words
    .filter((w) => {
      const form = w.simplified.replace(/[（(][^）)]*[）)]/g, '');
      return form && text.includes(form);
    })
    .map((w) => w.simplified);
}
