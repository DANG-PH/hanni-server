import {
  BLANK,
  answerOf,
  PAPERS,
  numberItems,
  publicPaper,
  rubyOf,
  scorePaper,
  type PinyinOverrides,
} from './mock-exam.content';

/** Cấu trúc đề HSK hiện hành theo cấp: số câu mỗi phần, theo thứ tự. */
const STRUCTURE: Record<number, Record<string, number[]>> = {
  1: { listening: [5, 5, 5, 5], reading: [5, 5, 5, 5] },
};
const PART_TYPES: Record<number, Record<string, string[]>> = {
  1: {
    listening: ['judge', 'choose-picture', 'match-picture', 'choose-text'],
    reading: ['judge', 'match-picture', 'match-text', 'fill-blank'],
  },
};

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
        for (const section of paper.sections) {
          expect(section.parts.map((p) => p.items.length)).toEqual(
            shape[section.kind],
          );
          expect(section.parts.map((p) => p.type)).toEqual(types[section.kind]);
        }
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
            if (part.type === 'choose-text')
              for (const it of part.items) {
                expect(it.options).toHaveLength(3);
                expect(new Set(it.options).size).toBe(3);
                expect(it.answer).toBeLessThan(3);
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
              expect(n).toBe(6);
              const used = (part.items as { answer: number }[]).map(
                (it) => it.answer,
              );
              // Mỗi phương án A–F chỉ đúng cho 1 câu, dư đúng 1 phương án.
              expect(new Set(used).size).toBe(used.length);
              for (const a of used) expect(a).toBeLessThan(n);
            }
            if (part.type === 'fill-blank')
              for (const it of part.items)
                expect(it.text.split(BLANK)).toHaveLength(2);
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
        expect(json).not.toMatch(/"answer"|"vi"|"explain"/);
      });
    });
  }
});

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

  it('không biến điệu 一/不 (giữ thanh gốc như từ điển)', () => {
    expect(rubyOf('不是', NO_OVERRIDES).py[0]).toBe('bù');
  });
});
