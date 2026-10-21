import {
  BLANK,
  acceptableSentence,
  answerOf,
  isCorrect,
  normalizeSentence,
  PAPERS,
  numberItems,
  partStats,
  practiceParts,
  practiceSets,
  publicPaper,
  reviewOf,
  rubyOf,
  scorePaper,
  wordsIn,
  type PinyinOverrides,
  type Vocab,
} from './mock-exam.content';

/** Cấu trúc đề HSK hiện hành theo cấp: số câu mỗi phần (theo dữ liệu — HSK 2
 * tách "第二部分" nghe và "第四部分" đọc thành 2 nửa có bộ tranh/đáp án riêng,
 * nửa sau đánh dấu `continues`). */
const STRUCTURE: Record<number, Record<string, number[]>> = {
  1: { listening: [5, 5, 5, 5], reading: [5, 5, 5, 5] },
  2: { listening: [10, 5, 5, 10, 5], reading: [5, 5, 5, 5, 5] },
  3: {
    listening: [5, 5, 10, 10, 10],
    reading: [5, 5, 5, 5, 10],
    writing: [5, 5],
  },
  4: {
    listening: [10, 15, 20],
    reading: [5, 5, 10, 20],
    writing: [10, 5],
  },
};
const PART_TYPES: Record<number, Record<string, string[]>> = {
  1: {
    listening: ['judge', 'choose-picture', 'match-picture', 'choose-text'],
    reading: ['judge', 'match-picture', 'match-text', 'fill-blank'],
  },
  2: {
    listening: [
      'judge',
      'match-picture',
      'match-picture',
      'choose-text',
      'choose-text',
    ],
    reading: [
      'match-picture',
      'fill-blank',
      'judge-text',
      'match-text',
      'match-text',
    ],
  },
  3: {
    listening: [
      'match-picture',
      'match-picture',
      'judge-text',
      'choose-text',
      'choose-text',
    ],
    reading: [
      'match-text',
      'match-text',
      'fill-blank',
      'fill-blank',
      'choose-text',
    ],
    writing: ['order', 'pinyin-char'],
  },
  4: {
    listening: ['judge-text', 'choose-text', 'choose-text'],
    reading: ['fill-blank', 'fill-blank', 'order', 'choose-text'],
    writing: ['order', 'write-sentence'],
  },
};
/** Phần nào là nửa sau (`continues`) — vị trí theo dữ liệu. */
const CONTINUES: Record<number, Record<string, number[]>> = {
  1: { listening: [], reading: [] },
  2: { listening: [2], reading: [4] },
  3: { listening: [1], reading: [1, 3], writing: [] },
  4: { listening: [], reading: [1], writing: [] },
};
const DURATION: Record<number, number> = { 1: 35, 2: 50, 3: 85, 4: 100 };

const NO_OVERRIDES: PinyinOverrides = new Map();

describe('nội dung đề thi thử', () => {
  it('slug không trùng', () => {
    const slugs = PAPERS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  for (const paper of PAPERS) {
    describe(paper.slug, () => {
      it('đúng cấu trúc đề thật của cấp', () => {
        const shape = STRUCTURE[paper.level];
        const types = PART_TYPES[paper.level];
        expect(shape).toBeDefined();
        expect(paper.sections.map((s) => s.kind)).toEqual(Object.keys(shape));
        for (const section of paper.sections) {
          expect(section.parts.map((p) => p.items.length)).toEqual(
            shape[section.kind],
          );
          expect(section.parts.map((p) => p.type)).toEqual(types[section.kind]);
          expect(
            section.parts.flatMap((p, i) => (p.continues ? [i] : [])),
          ).toEqual(CONTINUES[paper.level][section.kind]);
        }
        expect(paper.durationMin).toBe(DURATION[paper.level]);
      });

      it('đáp án nằm trong phạm vi phương án', () => {
        for (const section of paper.sections)
          for (const part of section.parts) {
            if (part.type === 'judge')
              for (const it of part.items)
                expect(typeof it.answer).toBe('boolean');
            if (part.type === 'choose-picture')
              for (const it of part.items) {
                expect(it.pictures).toHaveLength(3);
                expect(it.answer).toBeGreaterThanOrEqual(0);
                expect(it.answer).toBeLessThan(3);
              }
            if (part.type === 'choose-text') {
              // HSK 1–3 chọn A/B/C, HSK 4 trở lên A/B/C/D.
              const n = paper.level >= 4 ? 4 : 3;
              for (const it of part.items) {
                expect(it.options).toHaveLength(n);
                expect(new Set(it.options).size).toBe(n);
                expect(it.answer).toBeLessThan(n);
              }
            }
            if (
              part.type === 'match-picture' ||
              part.type === 'match-text' ||
              part.type === 'fill-blank'
            ) {
              const n =
                part.type === 'match-picture'
                  ? part.pictures.length
                  : part.options.length;
              // Bộ A–F: thừa đúng 1 phương án (như đề thật — phương án của câu
              // ví dụ); riêng nửa sau HSK 2 (A–E) đủ đúng 5 cho 5 câu.
              expect(
                n === part.items.length + 1 ||
                  (part.continues && n === part.items.length),
              ).toBe(true);
              const used = (part.items as { answer: number }[]).map(
                (it) => it.answer,
              );
              // Mỗi phương án chỉ đúng cho 1 câu.
              expect(new Set(used).size).toBe(used.length);
              for (const a of used) expect(a).toBeLessThan(n);
            }
            if (part.type === 'fill-blank')
              for (const it of part.items)
                expect(it.text.split(BLANK)).toHaveLength(2);
            if (part.type === 'judge-text')
              for (const it of part.items) {
                expect(typeof it.answer).toBe('boolean');
                expect(it.statement.trim().length).toBeGreaterThan(0);
                // Phần nghe chỉ có lời đọc, phần đọc chỉ có đoạn văn in sẵn.
                if (section.kind === 'listening')
                  expect(it.text).toBeUndefined();
                else expect(it.text?.trim()).toBeTruthy();
              }
            if (part.type === 'choose-text' && section.kind === 'reading')
              for (const it of part.items) {
                expect(it.text?.trim()).toBeTruthy();
                expect(it.question?.trim()).toBeTruthy();
              }
            if (part.type === 'order')
              for (const it of part.items) {
                expect(it.pieces.length).toBeGreaterThanOrEqual(3);
                const accepted = [it.answer, ...(it.alternatives ?? [])];
                // Mảnh ghép lại (theo 1 thứ tự nào đó) ra đúng từng câu đáp án…
                for (const a of accepted)
                  expect(canForm(it.pieces, normalizeSentence(a))).toBe(true);
                // …nhưng thứ tự in trên đề không phải là đáp án.
                expect(accepted.map(normalizeSentence)).not.toContain(
                  it.pieces.join(''),
                );
              }
            if (part.type === 'write-sentence')
              for (const it of part.items) {
                // Câu mẫu phải tự qua được cách chấm tự động — chấm sai câu mẫu thì cách chấm có vấn đề.
                for (const a of [it.answer, ...(it.alternatives ?? [])])
                  expect(acceptableSentence(a, it.word)).toBe(true);
                expect(acceptableSentence(it.word, it.word)).toBe(false);
              }
            if (part.type === 'pinyin-char')
              for (const it of part.items) {
                expect(it.text.split(BLANK)).toHaveLength(2);
                expect(it.choices).toHaveLength(6);
                expect(new Set(it.choices).size).toBe(6);
                for (const c of it.choices)
                  expect(Array.from(c)).toHaveLength(1);
                expect(it.answer).toBeLessThan(6);
                // Pinyin in trên đề khớp cách đọc của chữ đáp án TRONG câu.
                const full = it.text.replace(BLANK, it.choices[it.answer]);
                const at = Array.from(it.text.split(BLANK)[0]).length;
                expect(rubyOf(full, NO_OVERRIDES).py[at]).toBe(
                  it.pinyin.toLowerCase(),
                );
              }
          }
      });

      it('mọi câu có bản dịch, câu nghe có lời thoại', () => {
        for (const section of paper.sections)
          for (const part of section.parts)
            for (const it of part.items) {
              expect(it.vi.trim().length).toBeGreaterThan(0);
              if (section.kind === 'listening')
                expect('audio' in it && it.audio?.length).toBeTruthy();
            }
      });

      it('đề gửi xuống không lộ đáp án/bản dịch/nhãn tranh', () => {
        const json = JSON.stringify(
          publicPaper(paper, NO_OVERRIDES, new Map()),
        );
        expect(json).not.toMatch(/"answer"|"vi"|"explain"|"alternatives"/);
      });
    });
  }
});

/** Ghép được `target` từ đúng toàn bộ các mảnh (mỗi mảnh 1 lần) không. */
function canForm(pieces: string[], target: string): boolean {
  if (pieces.length === 0) return target === '';
  return pieces.some(
    (p, i) =>
      target.startsWith(p) &&
      canForm(
        pieces.filter((_, j) => j !== i),
        target.slice(p.length),
      ),
  );
}

describe('scorePaper', () => {
  const paper = PAPERS[0];
  const items = numberItems(paper);
  const key = items.map(answerOf);

  it('đúng hết = điểm tối đa, đạt', () => {
    const r = scorePaper(paper, key);
    expect(r.score).toBe(r.maxScore);
    expect(r.passed).toBe(true);
    expect(r.sections.every((s) => s.correct === s.total)).toBe(true);
  });

  it('bỏ trống hết = 0 điểm; sai kiểu đáp án tính như sai', () => {
    expect(scorePaper(paper, []).score).toBe(0);
    const wrongType = key.map((a) => (typeof a === 'boolean' ? 1 : true));
    expect(scorePaper(paper, wrongType).score).toBe(0);
  });

  it('quy đổi thang 100 mỗi phần, mốc đạt 120/200', () => {
    // Nghe đúng 12/20, đọc đúng 12/20 → 60 + 60 = 120 → vừa đạt.
    const answers = key.map((a, i) => {
      const inSection = items[i].no <= 20 ? i : i - 20;
      return inSection < 12 ? a : null;
    });
    const r = scorePaper(paper, answers);
    expect(r.sections.map((s) => s.score)).toEqual([60, 60]);
    expect(r.score).toBe(120);
    expect(r.passed).toBe(true);
    expect(scorePaper(paper, answers.slice(0, -21)).passed).toBe(false);
  });
});

describe('chấm câu sắp xếp (HSK 3 phần viết)', () => {
  const paper = PAPERS.find((p) => p.slug === 'hsk3-de-1')!;
  const items = numberItems(paper);
  const order = items.filter((n) => n.part.type === 'order');
  const alt = order.find((n) => {
    const raw = n.part.items[n.itemIndex];
    return 'alternatives' in raw && raw.alternatives?.length;
  })!;

  it('không cần dấu câu/khoảng trắng; nhận cả thứ tự thay thế', () => {
    const raw = alt.part.items[alt.itemIndex] as {
      answer: string;
      alternatives: string[];
    };
    expect(isCorrect(alt, raw.answer)).toBe(true);
    expect(isCorrect(alt, normalizeSentence(raw.answer))).toBe(true);
    expect(isCorrect(alt, ` ${raw.alternatives[0]} `)).toBe(true);
    expect(isCorrect(alt, '八点我们出发明天早上')).toBe(false);
    expect(isCorrect(alt, 2)).toBe(false);
  });

  it('đề HSK 3 đủ 3 phần thi, đúng hết = 300, mốc đạt 180', () => {
    const r = scorePaper(paper, items.map(answerOf));
    expect(r.maxScore).toBe(300);
    expect(r.score).toBe(300);
    expect(r.passScore).toBe(180);
    const writing = partStats([
      { examSlug: paper.slug, answers: items.map(answerOf) },
    ]).filter((s) => s.section === 'writing');
    expect(writing.map((s) => [s.part, s.type, s.correct, s.total])).toEqual([
      [1, 'order', 5, 5],
      [2, 'pinyin-char', 5, 5],
    ]);
  });
});

describe('luyện từng dạng bài', () => {
  const sets = practiceSets();

  it('mỗi phần đề chính thức của mỗi cấp là 1 bộ, slug không trùng', () => {
    expect(new Set(sets.map((x) => x.slug)).size).toBe(sets.length);
    // HSK 1–2: nghe 4 + đọc 4; HSK 3: nghe 4 + đọc 3 + viết 2.
    for (const [level, n] of [
      [1, 8],
      [2, 8],
      [3, 9],
    ])
      expect(sets.filter((x) => x.level === level)).toHaveLength(n);
    // Tổng số câu các bộ của 1 cấp = tổng số câu mọi đề cấp đó.
    for (const level of [1, 2, 3]) {
      const items = PAPERS.filter((p) => p.level === level).reduce(
        (sum, p) => sum + numberItems(p).length,
        0,
      );
      expect(
        sets
          .filter((x) => x.level === level)
          .reduce((sum, x) => sum + x.count, 0),
      ).toBe(items);
    }
    expect(sets.find((x) => x.slug === 'hsk3-viet-1')).toMatchObject({
      type: 'order',
      count: 15,
    });
  });

  it('gom cả 2 nửa `continues` của cùng phần đề, theo từng đề', () => {
    const found = practiceParts('hsk2-nghe-2')!;
    expect(found.refs).toHaveLength(6);
    expect(
      found.refs.map(
        (r) =>
          r.paper.sections[r.sectionIndex].parts[r.partIndex].continues ??
          false,
      ),
    ).toEqual([false, true, false, true, false, true]);
  });

  it('slug sai hoặc cấp/phần không có → null', () => {
    expect(practiceParts('linh-tinh')).toBeNull();
    expect(practiceParts('hsk9-nghe-1')).toBeNull();
    expect(practiceParts('hsk1-viet-1')).toBeNull();
    expect(practiceParts('hsk1-nghe-9')).toBeNull();
  });
});

describe('rubyOf', () => {
  it('pinyin căn đúng từng chữ, dấu câu để trống', () => {
    const r = rubyOf('你好，我是大卫。', NO_OVERRIDES);
    expect(r.py).toHaveLength(Array.from(r.zh).length);
    expect(r.py[2]).toBe('');
    expect(r.py[0]).toBe('nǐ');
  });

  it('từ điển sửa thanh nhẹ + 儿 hoá; 儿 ngoài từ điển đọc "r"', () => {
    const overrides: PinyinOverrides = new Map([
      ['名字', ['míng', 'zi']],
      ['女儿', ['nǚ', 'ér']],
    ]);
    expect(rubyOf('名字', overrides).py).toEqual(['míng', 'zi']);
    expect(rubyOf('我女儿', overrides).py).toEqual(['wǒ', 'nǚ', 'ér']);
    expect(rubyOf('有点儿忙', overrides).py[2]).toBe('r');
    // Chữ đơn chỉ có 1 cách đọc: theo từ điển; 儿 không bị chữ đơn ghi đè.
    const single: PinyinOverrides = new Map([
      ['谁', ['shéi']],
      ['儿', ['ér']],
    ]);
    expect(rubyOf('他是谁？', single).py[2]).toBe('shéi');
    expect(rubyOf('玩儿', single).py[1]).toBe('r');
  });

  it('câu điền từ: pinyin tính theo cả câu, không lộ chữ của đáp án', () => {
    const paper = PAPERS.find((p) => p.slug === 'hsk1-de-2')!;
    const pub = publicPaper(paper, NO_OVERRIDES, new Map());
    const part = pub.sections[1].parts[3];
    const item = part.items[0] as {
      blank: {
        before: { zh: string; py: string[] };
        after: { zh: string; py: string[] };
      };
    };
    // 我的女儿今年三（岁）了。 — đứng riêng "了。" bị đọc "liǎo".
    expect(item.blank.after.zh).toBe('了。');
    expect(item.blank.after.py[0]).toBe('le');
    expect(item.blank.before.zh + item.blank.after.zh).not.toContain('岁');
  });

  it('tách từ từ phải sang: 看中国 là 看 + 中国, không phải 看中 + 国', () => {
    const overrides: PinyinOverrides = new Map([
      ['看中', ['kàn', 'zhòng']],
      ['中国', ['zhōng', 'guó']],
      ['电影', ['diàn', 'yǐng']],
    ]);
    expect(rubyOf('我每天都看中国电影。', overrides).py[5]).toBe('zhōng');
  });

  it('得 sau động từ đọc "de", 着 trong 睡不着 đọc "zháo"', () => {
    expect(rubyOf('我考试考得很好。', NO_OVERRIDES).py[4]).toBe('de');
    expect(rubyOf('她跳舞跳得非常好。', NO_OVERRIDES).py[4]).toBe('de');
    expect(rubyOf('我得走了。', NO_OVERRIDES).py[1]).not.toBe('de');
    expect(rubyOf('喝了睡不着。', NO_OVERRIDES).py[4]).toBe('zháo');
    expect(rubyOf('你穿着很漂亮。', NO_OVERRIDES).py[2]).toBe('zhe');
  });

  it('只 sau số đếm là lượng từ "zhī", còn lại là "zhǐ"', () => {
    expect(rubyOf('他只来过一次。', NO_OVERRIDES).py[1]).toBe('zhǐ');
    expect(rubyOf('我家有两只猫。', NO_OVERRIDES).py[4]).toBe('zhī');
    expect(rubyOf('这只小狗很漂亮。', NO_OVERRIDES).py[1]).toBe('zhī');
  });

  it('không biến điệu 一/不 (giữ thanh gốc như từ điển)', () => {
    expect(rubyOf('不是', NO_OVERRIDES).py[0]).toBe('bù');
  });
});

describe('từ vựng chú thích khi chữa bài', () => {
  const entry = (zh: string, pinyin: string, hanViet: string, vi: string) => ({
    id: zh,
    zh,
    pinyin,
    hanViet,
    vi,
  });
  const vocab: Vocab = new Map(
    [
      entry('打电话', 'dǎ diàn huà', 'đả điện thoại', 'gọi điện thoại'),
      entry('电话', 'diàn huà', 'điện thoại', 'điện thoại'),
      entry('喜欢', 'xǐ huan', 'hỉ hoan', 'thích'),
      entry('我', 'wǒ', 'ngã', 'tôi'),
      entry('喝', 'hē', 'hát', 'uống'),
      entry('茶', 'chá', 'trà', 'trà'),
    ].map((e) => [e.zh, e]),
  );

  it('khớp từ dài nhất trước, bỏ đại từ quá phổ biến, không trùng', () => {
    const words = wordsIn(['我喜欢打电话。', '我喜欢喝茶。'], vocab);
    expect(words.map((w) => w.zh)).toEqual(['喜欢', '打电话', '喝', '茶']);
  });

  it('câu điền từ: tìm từ trên câu ĐÃ điền đáp án', () => {
    const paper = PAPERS.find((p) => p.slug === 'hsk1-de-2')!;
    const fill = numberItems(paper).find((n) => n.part.type === 'fill-blank')!;
    const raw = fill.part.items[fill.itemIndex] as { answer: number };
    const answerWord =
      fill.part.type === 'fill-blank' ? fill.part.options[raw.answer] : '';
    const withAnswer: Vocab = new Map([
      [answerWord, entry(answerWord, 'x', 'x', 'x')],
    ]);
    const review = reviewOf(paper, NO_OVERRIDES, withAnswer);
    expect(review[fill.no - 1].words?.map((w) => w.zh)).toContain(answerWord);
  });

  it('không có từ điển thì không gửi trường words', () => {
    const review = reviewOf(PAPERS[0], NO_OVERRIDES);
    expect(review.every((r) => !('words' in r))).toBe(true);
  });
});

describe('partStats', () => {
  it('cộng dồn theo từng phần, đúng 5 câu mỗi phần HSK 1', () => {
    const paper = PAPERS[0];
    const key = numberItems(paper).map(answerOf);
    const stats = partStats([
      { examSlug: paper.slug, answers: key },
      { examSlug: paper.slug, answers: [] },
      { examSlug: 'khong-co', answers: key },
    ]);
    expect(stats).toHaveLength(8);
    for (const s of stats) {
      expect(s.total).toBe(10);
      expect(s.correct).toBe(5);
    }
    expect(stats[0]).toMatchObject({
      section: 'listening',
      part: 1,
      type: 'judge',
    });
  });
});

/**
 * Đề cấp N chỉ được dùng chữ Hán có trong từ vựng HSK cấp ≤ N (dữ liệu từ
 * điển của chính Hanni, `data/processed/words.seed.json`) + vài chữ tên riêng.
 * Xét theo CHỮ (không theo từ) vì lượng từ đứng riêng (一杯) hay tách khỏi từ
 * ghép (杯子) trong đề thật.
 */
describe('đề chỉ dùng chữ trong phạm vi cấp', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const words = require('../../../data/processed/words.seed.json') as {
    simplified: string;
    hskLevel: number;
  }[];
  // Tên riêng trong đề: 北京, 上海, 越南, 大卫, 李月, 王/张 (họ).
  const NAMES = new Set(Array.from('李王张卫北京上海越南'));
  const HAN = /\p{Script=Han}/u;
  const allowed = (level: number) => {
    const set = new Set(NAMES);
    for (const w of words)
      if (w.hskLevel <= level)
        for (const c of Array.from(w.simplified)) set.add(c);
    return set;
  };
  const textsOf = (paper: (typeof PAPERS)[number]) =>
    paper.sections.flatMap((s) =>
      s.parts.flatMap((part) => [
        ...('options' in part ? part.options : []),
        ...(part.items as unknown as Record<string, unknown>[]).flatMap(
          (it) => [
            ...((it.audio as { zh: string }[] | undefined) ?? []).map(
              (l) => l.zh,
            ),
            ...['text', 'statement', 'question', 'answer', 'word'].map((k) =>
              typeof it[k] === 'string' ? it[k] : '',
            ),
            ...((it.options as string[] | undefined) ?? []),
            ...((it.pieces as string[] | undefined) ?? []),
            ...((it.alternatives as string[] | undefined) ?? []),
          ],
        ),
      ]),
    );
  for (const paper of PAPERS)
    it(paper.slug, () => {
      const ok = allowed(paper.level);
      const outside = new Set<string>();
      for (const t of textsOf(paper))
        for (const c of Array.from(t))
          if (HAN.test(c) && !ok.has(c)) outside.add(c);
      expect([...outside].join('')).toBe('');
    });
  // Chữ nhiễu ở câu viết chữ theo pinyin chỉ cần là chữ THẬT người học có
  // thể gặp (như danh sách của bộ gõ), không bắt cùng cấp — nhưng không lấy
  // chữ hiếm ngoài HSK 6.
  it('chữ để chọn ở câu viết chữ nằm trong từ vựng HSK ≤ 6', () => {
    const ok = allowed(6);
    const outside = PAPERS.flatMap((paper) =>
      paper.sections.flatMap((s) =>
        s.parts.flatMap((part) =>
          part.type === 'pinyin-char'
            ? part.items.flatMap((it) => it.choices.filter((c) => !ok.has(c)))
            : [],
        ),
      ),
    );
    expect(outside.join('')).toBe('');
  });
});
