import { pinyin } from 'pinyin-pro';
import type {
  AnswerValue,
  MockPaper,
  PaperPart,
  SectionKind,
  SpeechLine,
} from './mock-exam.types';
import { HSK1_PAPERS } from './papers/hsk1';

export const PAPERS: MockPaper[] = [...HSK1_PAPERS];

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
  for (let i = 0; i < chars.length;) {
    let matched = 0;
    for (let len = Math.min(MAX_WORD, chars.length - i); len >= 1; len--) {
      // 儿 đứng riêng để luật 儿 hoá bên dưới quyết định ("r" hay "ér").
      if (len === 1 && chars[i] === '儿') break;
      const syllables = overrides.get(chars.slice(i, i + len).join(''));
      if (syllables?.length !== len) continue;
      for (let k = 0; k < len; k++) {
        py[i + k] = syllables[k];
        fromDictionary[i + k] = true;
      }
      matched = len;
      break;
    }
    i += matched || 1;
  }
  return {
    zh,
    py: chars.map((c, i) => {
      if (!HAN.test(c)) return '';
      // 儿 hoá ngoài từ điển (有点儿, 玩儿): đọc "r", không phải "ér" — 女儿,
      // 儿子 đã được từ điển ghi đúng "ér" ở bước trên.
      if (c === '儿' && !fromDictionary[i] && i > 0 && HAN.test(chars[i - 1]))
        return 'r';
      return py[i];
    }),
  };
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
  part: PaperPart;
  itemIndex: number;
}

/** Đánh số câu liên tục cả đề như đề thật (HSK 1: Nghe 1–20, Đọc 21–40). */
export function numberItems(paper: MockPaper): NumberedItem[] {
  const out: NumberedItem[] = [];
  let no = 1;
  for (const section of paper.sections)
    section.parts.forEach((part, partIndex) => {
      itemsOf(part).forEach((_, itemIndex) =>
        out.push({
          no: no++,
          section: section.kind,
          partIndex,
          part,
          itemIndex,
        }),
      );
    });
  return out;
}

export function answerOf(n: NumberedItem): AnswerValue {
  return itemsOf(n.part)[n.itemIndex].answer;
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
    const answer = answerOf(n);
    return {
      no: n.no,
      section: n.section,
      given: given ?? null,
      answer,
      correct: given === answer,
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
          if (
            part.type === 'fill-blank' &&
            'text' in raw &&
            raw.text &&
            typeof raw.answer === 'number'
          )
            item.blank = blank(raw.text, part.options[raw.answer]);
          else if ('text' in raw && raw.text) item.text = ruby(raw.text);
          if ('picture' in raw) item.picture = raw.picture.e;
          if ('pictures' in raw) item.pictures = raw.pictures.map((p) => p.e);
          if ('options' in raw) item.options = raw.options.map(ruby);
          return item;
        });
        return {
          no: first,
          type: part.type,
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

/** Phần chữa bài gửi SAU khi nộp: đáp án + bản dịch + lời thoại có pinyin. */
export function reviewOf(paper: MockPaper, overrides: PinyinOverrides) {
  return numberItems(paper).map((n) => {
    const raw = itemsOf(n.part)[n.itemIndex];
    return {
      no: n.no,
      answer: raw.answer,
      vi: raw.vi,
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
