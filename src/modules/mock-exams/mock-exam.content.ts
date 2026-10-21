import { pinyin } from 'pinyin-pro';
import type {
  AnswerValue,
  MockPaper,
  PaperPart,
  SectionKind,
  SpeechLine,
} from './mock-exam.types';
import { HSK1_PAPERS } from './papers/hsk1';
import { HSK2_PAPERS } from './papers/hsk2';
import { HSK3_PAPERS } from './papers/hsk3';
import { HSK4_PAPERS } from './papers/hsk4';

export const PAPERS: MockPaper[] = [
  ...HSK1_PAPERS,
  ...HSK2_PAPERS,
  ...HSK3_PAPERS,
  ...HSK4_PAPERS,
];

/** Mỗi phần thi tối đa 100 điểm (HSK 1–2: 200 điểm, HSK 3–6: 300 điểm), đạt
 * từ 60% tổng điểm — đúng mốc 120/200 và 180/300 của đề thật. */
export const SECTION_MAX = 100;
const PASS_RATIO = 0.6;
/** Đề HSK 1–2 in pinyin trên chữ Hán; từ HSK 3 thì không. */
const PINYIN_MAX_LEVEL = 2;
export const BLANK = '（ ）';

/** Câu chữ Hán kèm pinyin từng chữ (`py[i]` ứng với `Array.from(zh)[i]`,
 * dấu câu/ký tự không phải chữ Hán là chuỗi rỗng). */
export interface Ruby {
  zh: string;
  py: string[];
}

/** Pinyin chuẩn của từ/chữ có đúng 1 cách đọc trong từ điển Hanni: `pinyin-pro`
 * đọc 名字 thành "míng zì", 哪儿 thành "nǎ ér", 谁 thành "shuí" — từ điển ghi
 * "míng zi", "nǎ r", "shéi" như đề HSK. Từ ghép được khớp TRƯỚC (dài nhất), nên
 * 了 trong 了解 vẫn là "liǎo". Chữ có nhiều mục (还, 得, 只) không nằm ở đây —
 * để `pinyin-pro` đoán theo ngữ cảnh, chọn bừa 1 mục sẽ sai hơn. */
export type PinyinOverrides = Map<string, string[]>;

const HAN = /\p{Script=Han}/u;
const MAX_WORD = 4;
/** Trước 得 mà là đại từ thì 得 thường là "děi" (我得走了) — không áp luật "de". */
const PRONOUNS = new Set(Array.from('我你他她它您们'));
/** 只 là lượng từ "zhī" khi đứng sau số đếm/từ chỉ định (一只狗, 这只猫); còn
 * lại là phó từ "zhǐ" (他只来过一次 — pinyin-pro từng đọc nhầm "zhī"). */
const BEFORE_MEASURE = new Set(
  Array.from('一二三四五六七八九十两几这那哪每半'),
);

export function rubyOf(zh: string, overrides: PinyinOverrides): Ruby {
  const chars = Array.from(zh);
  let py = pinyin(zh, {
    type: 'array',
    toneType: 'symbol',
    nonZh: 'spaced',
    toneSandhi: false,
  });
  if (py.length !== chars.length)
    py = chars.map((c) =>
      HAN.test(c) ? pinyin(c, { toneType: 'symbol', toneSandhi: false }) : '',
    );
  const fromDictionary = new Array<boolean>(chars.length).fill(false);
  // Ghép từ từ PHẢI sang TRÁI, khớp dài nhất: đi từ trái thì "看中国电影" bị
  // nhận thành 看中 (kàn zhòng) + 国; từ phải ra 看 + 中国 đúng — tách từ ngược
  // vốn chính xác hơn với tiếng Trung.
  for (let end = chars.length; end > 0;) {
    let matched = 0;
    for (let len = Math.min(MAX_WORD, end); len >= 1; len--) {
      // 儿 đứng riêng để luật 儿 hoá bên dưới quyết định ("r" hay "ér").
      if (len === 1 && chars[end - 1] === '儿') break;
      const start = end - len;
      const syllables = overrides.get(chars.slice(start, end).join(''));
      if (syllables?.length !== len) continue;
      for (let k = 0; k < len; k++) {
        py[start + k] = syllables[k];
        fromDictionary[start + k] = true;
      }
      matched = len;
      break;
    }
    end -= matched || 1;
  }
  return {
    zh,
    py: chars.map((c, i) => {
      if (!HAN.test(c)) return '';
      // 儿 hoá ngoài từ điển (有点儿, 玩儿): đọc "r", không phải "ér" — 女儿,
      // 儿子 đã được từ điển ghi đúng "ér" ở bước trên.
      if (c === '儿' && !fromDictionary[i] && i > 0 && HAN.test(chars[i - 1]))
        return 'r';
      // Chữ đa âm từ điển không gỡ được (nhiều mục) mà pinyin-pro hay đoán sai:
      // 得 đứng riêng sau động/tính từ là trợ từ kết cấu (考得很好) — "de"
      // chứ không "dé"; 着 sau 不/得 là bổ ngữ (睡不着) — "zháo" chứ không "zhe".
      const prev = i > 0 ? chars[i - 1] : '';
      if (
        c === '得' &&
        !fromDictionary[i] &&
        HAN.test(prev) &&
        !PRONOUNS.has(prev)
      )
        return 'de';
      if (c === '着' && !fromDictionary[i] && (prev === '不' || prev === '得'))
        return 'zháo';
      if (c === '只' && !fromDictionary[i])
        return BEFORE_MEASURE.has(prev) ? 'zhī' : 'zhǐ';
      return py[i];
    }),
  };
}

/** Từ trong từ điển Hanni dùng để chú thích phần chữa bài. */
export interface VocabEntry {
  id: string;
  zh: string;
  pinyin: string;
  hanViet: string | null;
  vi: string;
}
/** Chỉ từ có ĐÚNG 1 mục trong từ điển — chữ đa âm (还, 得) chọn bừa 1 mục dễ sai. */
export type Vocab = Map<string, VocabEntry>;

/** Đại từ/hư từ có trong gần như mọi câu — liệt kê ra chỉ thêm nhiễu. */
const TOO_COMMON = new Set([
  ...Array.from('的了吗呢吧啊是我你他她它们很不也都和个这那在有'),
  '我们',
  '你们',
  '他们',
]);
const MAX_WORDS = 6;

/** Tách câu theo từ điển (khớp dài nhất trước) → các từ đáng chú ý, không trùng. */
export function wordsIn(texts: string[], vocab: Vocab): VocabEntry[] {
  const out: VocabEntry[] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    const chars = Array.from(text);
    for (let i = 0; i < chars.length;) {
      let hit: VocabEntry | undefined;
      for (let len = Math.min(MAX_WORD, chars.length - i); len >= 1; len--) {
        hit = vocab.get(chars.slice(i, i + len).join(''));
        if (hit) break;
      }
      if (!hit) {
        i++;
        continue;
      }
      if (!TOO_COMMON.has(hit.zh) && !seen.has(hit.zh)) {
        seen.add(hit.zh);
        out.push(hit);
      }
      i += Array.from(hit.zh).length;
    }
  }
  return out.slice(0, MAX_WORDS);
}

type AnyItem = PaperPart['items'][number];

/** `part.items` là hợp nhiều KIỂU MẢNG — gọi `.map`/đánh chỉ số trên đó ra
 * `any`; quy về một mảng hợp kiểu phần tử để `'audio' in raw` thu hẹp được. */
function itemsOf(part: PaperPart): AnyItem[] {
  return part.items;
}

export interface NumberedItem {
  no: number;
  section: SectionKind;
  partIndex: number;
  /** Thứ tự phần đề CHÍNH THỨC trong phần thi (0-based) — 2 nửa `continues`
   * của cùng "第二部分" có chung số này. */
  officialPart: number;
  part: PaperPart;
  itemIndex: number;
}

/** Đánh số câu liên tục cả đề như đề thật (HSK 1: Nghe 1–20, Đọc 21–40). */
export function numberItems(paper: MockPaper): NumberedItem[] {
  const out: NumberedItem[] = [];
  let no = 1;
  for (const section of paper.sections) {
    let official = -1;
    section.parts.forEach((part, partIndex) => {
      if (!part.continues) official++;
      itemsOf(part).forEach((_, itemIndex) =>
        out.push({
          no: no++,
          section: section.kind,
          partIndex,
          officialPart: official,
          part,
          itemIndex,
        }),
      );
    });
  }
  return out;
}

export function answerOf(n: NumberedItem): AnswerValue {
  return itemsOf(n.part)[n.itemIndex].answer;
}

/** Bỏ dấu câu + khoảng trắng — câu sắp xếp chỉ chấm thứ tự từ, không bắt
 * người làm thêm đúng dấu chấm/dấu hỏi cuối câu. */
export const normalizeSentence = (s: string) => s.replace(/[\s\p{P}]/gu, '');

/** Câu tự đặt (HSK 4 viết phần 2) đạt mức tối thiểu: dùng đúng từ cho sẵn, ít nhất 6 chữ Hán (4 chữ khác nhau),
 * chỉ gồm chữ Hán + dấu câu. Không chấm được ngữ pháp/ý như giám khảo — chữa bài kèm câu mẫu để người học tự so. */
export function acceptableSentence(given: string, word: string): boolean {
  const s = given.replace(/\s/g, '');
  const han = Array.from(s).filter((c) => HAN.test(c));
  return (
    s.includes(word) &&
    han.length >= 6 &&
    new Set(han).size >= 4 &&
    Array.from(s).every((c) => HAN.test(c) || /\p{P}/u.test(c))
  );
}

/** `given` có phải đáp án đúng của câu `n` không. Câu sắp xếp nhận cả các
 * thứ tự khác cũng đúng (`alternatives`); sai kiểu thì tính như sai. */
export function isCorrect(n: NumberedItem, given: unknown): boolean {
  const raw = itemsOf(n.part)[n.itemIndex];
  if ('word' in raw)
    return typeof given === 'string' && acceptableSentence(given, raw.word);
  if ('pieces' in raw) {
    if (typeof given !== 'string') return false;
    const g = normalizeSentence(given);
    return [raw.answer, ...(raw.alternatives ?? [])].some(
      (a) => normalizeSentence(a) === g,
    );
  }
  return given === raw.answer;
}

export function paperMeta(paper: MockPaper) {
  const items = numberItems(paper);
  const maxScore = paper.sections.length * SECTION_MAX;
  return {
    slug: paper.slug,
    level: paper.level,
    title: paper.title,
    durationMin: paper.durationMin,
    questionCount: items.length,
    maxScore,
    passScore: Math.round(maxScore * PASS_RATIO),
    sections: paper.sections.map((s) => ({
      kind: s.kind,
      count: items.filter((i) => i.section === s.kind).length,
    })),
  };
}

export interface SectionScore {
  kind: SectionKind;
  correct: number;
  total: number;
  score: number;
}

/** Chấm đề. `answers[no - 1]` là đáp án người làm chọn cho câu `no` (null =
 * bỏ trống). Mỗi phần thi quy về thang 100 theo tỉ lệ câu đúng. */
export function scorePaper(
  paper: MockPaper,
  answers: (AnswerValue | null | undefined)[],
) {
  const items = numberItems(paper);
  const results = items.map((n) => {
    const given = answers[n.no - 1];
    return {
      no: n.no,
      section: n.section,
      given: given ?? null,
      answer: answerOf(n),
      correct: isCorrect(n, given),
    };
  });
  const sections: SectionScore[] = paper.sections.map((s) => {
    const inSection = results.filter((r) => r.section === s.kind);
    const correct = inSection.filter((r) => r.correct).length;
    return {
      kind: s.kind,
      correct,
      total: inSection.length,
      score: Math.round(
        (correct / Math.max(1, inSection.length)) * SECTION_MAX,
      ),
    };
  });
  const { maxScore, passScore } = paperMeta(paper);
  const score = sections.reduce((sum, s) => sum + s.score, 0);
  return {
    score,
    maxScore,
    passScore,
    passed: score >= passScore,
    sections,
    results,
  };
}

function speech(lines: SpeechLine[], audioUrl?: string) {
  return { lines, ...(audioUrl ? { url: audioUrl } : {}) };
}

/** Đề gửi cho người làm bài — KHÔNG kèm đáp án, nhãn tranh hay bản dịch.
 * Lời thoại phần nghe vẫn phải gửi (client tự đọc bằng giọng trình duyệt).
 * `audioByWord`: từ đơn có bản ghi âm thật ("打电话", "米饭") phát bản ghi âm
 * thay cho giọng máy. */
export function publicPaper(
  paper: MockPaper,
  overrides: PinyinOverrides,
  audioByWord: Map<string, string>,
) {
  const ruby = (zh: string) => rubyOf(zh, overrides);
  /** Pinyin tính trên CẢ câu đã lắp đáp án rồi mới cắt quanh chỗ trống — để
   * riêng "了。" thì bị đọc "liǎo" thay vì "le". Chỉ gửi 2 nửa, không lộ đáp án. */
  const blank = (text: string, fill: string) => {
    const [before, after = ''] = text.split(BLANK);
    const { py } = rubyOf(before + fill + after, overrides);
    const head = Array.from(before).length;
    return {
      before: { zh: before, py: py.slice(0, head) },
      after: { zh: after, py: py.slice(head + Array.from(fill).length) },
    };
  };
  /** Pinyin từng mảnh câu sắp xếp lấy theo vị trí trong câu ĐÚNG — đứng riêng
   * thì "地"/"了" dễ bị đọc sai. Chỉ gửi pinyin, không lộ thứ tự. */
  const piecesOf = (pieces: string[], answer: string) => {
    const full = rubyOf(answer, overrides);
    const chars = Array.from(answer);
    const used = new Set<number>();
    return pieces.map((piece) => {
      const len = Array.from(piece).length;
      for (let i = 0; i + len <= chars.length; i++)
        if (!used.has(i) && chars.slice(i, i + len).join('') === piece) {
          used.add(i);
          return { zh: piece, py: full.py.slice(i, i + len) };
        }
      return ruby(piece);
    });
  };
  let no = 1;
  return {
    ...paperMeta(paper),
    showPinyin: paper.level <= PINYIN_MAX_LEVEL,
    sections: paper.sections.map((section) => ({
      kind: section.kind,
      parts: section.parts.map((part) => {
        const first = no;
        const items = itemsOf(part).map((raw) => {
          const item = { no: no++ } as Record<string, unknown>;
          if ('audio' in raw && raw.audio) {
            const only = raw.audio.length === 1 ? raw.audio[0].zh : null;
            item.audio = speech(
              raw.audio,
              only ? audioByWord.get(only) : undefined,
            );
          }
          // Chữ lắp vào chỗ trống (điền từ / viết chữ theo pinyin) — chỉ để
          // tính pinyin cả câu, không gửi xuống.
          const fill =
            part.type === 'fill-blank' && typeof raw.answer === 'number'
              ? part.options[raw.answer]
              : 'choices' in raw
                ? raw.choices[raw.answer]
                : null;
          if (fill !== null && 'text' in raw && raw.text)
            item.blank = blank(raw.text, fill);
          else if ('text' in raw && raw.text) item.text = ruby(raw.text);
          if ('question' in raw && raw.question)
            item.question = ruby(raw.question);
          if ('statement' in raw) item.statement = ruby(raw.statement);
          if ('word' in raw) item.word = ruby(raw.word);
          if ('pieces' in raw) item.pieces = piecesOf(raw.pieces, raw.answer);
          if ('choices' in raw) {
            item.pinyin = raw.pinyin;
            item.choices = raw.choices;
          }
          if ('picture' in raw) item.picture = raw.picture.e;
          if ('pictures' in raw) item.pictures = raw.pictures.map((p) => p.e);
          if ('options' in raw) item.options = raw.options.map(ruby);
          return item;
        });
        return {
          no: first,
          type: part.type,
          ...(part.continues ? { continues: true } : {}),
          ...('pictures' in part
            ? { pictures: part.pictures.map((p) => p.e) }
            : {}),
          ...('options' in part ? { options: part.options.map(ruby) } : {}),
          items,
        };
      }),
    })),
  };
}

/** Câu chữ của 1 câu hỏi kèm đáp án đúng (lời thoại, câu đọc, câu đã điền
 * từ, câu trả lời đúng) — để tìm từ vựng chú thích khi chữa bài. */
function textsOf(n: NumberedItem): string[] {
  const raw = itemsOf(n.part)[n.itemIndex];
  const texts: string[] = [];
  // Bỏ chữ dẫn "问：" của câu hỏi — là khuôn đề, không phải từ cần học.
  if ('audio' in raw && raw.audio)
    texts.push(...raw.audio.map((l) => l.zh.replace(/^问[：:]/, '')));
  if (n.part.type === 'fill-blank' && 'text' in raw && raw.text)
    texts.push(raw.text.replace(BLANK, n.part.options[raw.answer as number]));
  else if ('choices' in raw)
    texts.push(raw.text.replace(BLANK, raw.choices[raw.answer]));
  else if ('text' in raw && raw.text) texts.push(raw.text);
  if ('question' in raw && raw.question) texts.push(raw.question);
  if ('statement' in raw) texts.push(raw.statement);
  if ('pieces' in raw || 'word' in raw) texts.push(raw.answer);
  if (n.part.type === 'match-text')
    texts.push(n.part.options[raw.answer as number]);
  if ('options' in raw && typeof raw.answer === 'number')
    texts.push(raw.options[raw.answer]);
  return texts;
}

/** Phần chữa bài gửi SAU khi nộp: đáp án + bản dịch + lời thoại có pinyin +
 * từ vựng trong câu (pinyin, âm Hán Việt, nghĩa) — lớp giải thích thứ ba
 * như app Migii HSK ("dựa vào từ khoá…"), riêng Hanni có âm Hán Việt. */
export function reviewOf(
  paper: MockPaper,
  overrides: PinyinOverrides,
  vocab: Vocab = new Map(),
) {
  return numberItems(paper).map((n) => {
    const raw = itemsOf(n.part)[n.itemIndex];
    const words = wordsIn(textsOf(n), vocab);
    return {
      no: n.no,
      answer: raw.answer,
      vi: raw.vi,
      ...('alternatives' in raw && raw.alternatives?.length
        ? { alternatives: raw.alternatives }
        : {}),
      ...(words.length ? { words } : {}),
      ...(raw.explain ? { explain: raw.explain } : {}),
      ...('audio' in raw && raw.audio
        ? {
            transcript: raw.audio.map((l) => ({
              s: l.s,
              ...rubyOf(l.zh, overrides),
            })),
          }
        : {}),
      ...('picture' in raw ? { pictureLabels: [raw.picture.vi] } : {}),
      ...('pictures' in raw
        ? { pictureLabels: raw.pictures.map((p) => p.vi) }
        : 'pictures' in n.part
          ? { pictureLabels: n.part.pictures.map((p) => p.vi) }
          : {}),
    };
  });
}

/** Đoạn slug của phần thi trong URL bộ luyện (`hsk3-viet-1`). */
export const SECTION_SLUG: Record<SectionKind, string> = {
  listening: 'nghe',
  reading: 'doc',
  writing: 'viet',
};

export interface PracticeSetMeta {
  slug: string;
  level: number;
  section: SectionKind;
  /** Phần đề chính thức (1-based), như "第一部分". */
  part: number;
  type: PaperPart['type'];
  /** Tổng số câu của dạng này qua mọi đề cùng cấp. */
  count: number;
}

/** "Luyện từng dạng bài" (như Migii HSK): gom cùng 1 phần đề CHÍNH THỨC của
 * mọi đề cùng cấp — vd HSK 3 · Viết · Phần 1 của 3 đề = 15 câu sắp xếp câu.
 * Thứ tự: cấp → phần thi → phần, đúng thứ tự đề. */
export function practiceSets(papers: MockPaper[] = PAPERS): PracticeSetMeta[] {
  const sets = new Map<string, PracticeSetMeta>();
  for (const paper of papers)
    for (const n of numberItems(paper)) {
      const slug = `hsk${paper.level}-${SECTION_SLUG[n.section]}-${n.officialPart + 1}`;
      const set = sets.get(slug) ?? {
        slug,
        level: paper.level,
        section: n.section,
        part: n.officialPart + 1,
        type: n.part.type,
        count: 0,
      };
      set.count++;
      sets.set(slug, set);
    }
  return [...sets.values()];
}

/** Các phần dữ liệu thuộc 1 bộ luyện, theo từng đề (cả 2 nửa `continues` —
 * mỗi nửa có bộ tranh/phương án dùng chung riêng). `null` nếu slug sai. */
export function practiceParts(slug: string, papers: MockPaper[] = PAPERS) {
  const m = /^hsk(\d+)-(nghe|doc|viet)-(\d+)$/.exec(slug);
  const section = m
    ? (Object.keys(SECTION_SLUG) as SectionKind[]).find(
        (k) => SECTION_SLUG[k] === m[2],
      )
    : undefined;
  if (!m || !section) return null;
  const level = Number(m[1]);
  const part = Number(m[3]);
  const refs: { paper: MockPaper; sectionIndex: number; partIndex: number }[] =
    [];
  for (const paper of papers.filter((p) => p.level === level)) {
    const sectionIndex = paper.sections.findIndex((s) => s.kind === section);
    if (sectionIndex < 0) continue;
    let official = -1;
    paper.sections[sectionIndex].parts.forEach((pp, partIndex) => {
      if (!pp.continues) official++;
      if (official === part - 1) refs.push({ paper, sectionIndex, partIndex });
    });
  }
  return refs.length ? { level, section, part, refs } : null;
}

export interface PartStat {
  level: number;
  section: SectionKind;
  /** Phần thứ mấy trong phần thi (1-based), như "第一部分". */
  part: number;
  type: PaperPart['type'];
  correct: number;
  total: number;
}

/** Tỉ lệ đúng theo từng phần đề, cộng dồn mọi lượt làm — "điểm mạnh, yếu".
 * Gom theo (cấp, phần thi, thứ tự phần) vì cùng cấp thì mọi đề cùng cấu trúc. */
export function partStats(
  attempts: { examSlug: string; answers: unknown }[],
): PartStat[] {
  const stats = new Map<string, PartStat>();
  for (const attempt of attempts) {
    const paper = PAPERS.find((p) => p.slug === attempt.examSlug);
    if (!paper || !Array.isArray(attempt.answers)) continue;
    const answers = attempt.answers as unknown[];
    for (const n of numberItems(paper)) {
      const key = `${paper.level}:${n.section}:${n.officialPart}`;
      const stat = stats.get(key) ?? {
        level: paper.level,
        section: n.section,
        part: n.officialPart + 1,
        type: n.part.type,
        correct: 0,
        total: 0,
      };
      stat.total++;
      if (isCorrect(n, answers[n.no - 1])) stat.correct++;
      stats.set(key, stat);
    }
  }
  return [...stats.values()];
}
