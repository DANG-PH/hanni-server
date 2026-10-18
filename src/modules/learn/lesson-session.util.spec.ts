import {
  buildChoiceStep,
  buildLessonSession,
  shortMeaning,
  type SessionStep,
  type SessionWordInput,
} from './lesson-session.util';

/** Nguồn ngẫu nhiên cố định để kết quả lặp lại được. */
function seeded(seed = 7): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const w = (
  id: string,
  simplified: string,
  meaningVi: string | null,
  extra: Partial<SessionWordInput> = {},
): SessionWordInput => ({
  id,
  simplified,
  meaningVi,
  audioUrl: `/media/audio/cmn-${simplified}.mp3`,
  examples: [],
  ...extra,
});

const LESSON = [
  w('1', '那里', 'chỗ kia'),
  w('2', '哪儿', 'ở đâu'),
  w('3', '哪里', 'ở đâu; chỗ nào'),
  w('4', '那儿', 'chỗ kia'),
  w('5', '多少', 'bao nhiêu'),
  w('6', '谁', 'ai'),
  w('7', '几', 'mấy'),
  w('8', '怎么样', 'thế nào', {
    examples: [{ zh: '你觉得怎么样？', pinyin: null, vi: 'Bạn thấy thế nào?' }],
  }),
  w('9', '为什么', 'tại sao'),
];
const POOL = [
  { simplified: '吃', meaningVi: 'ăn' },
  { simplified: '水', meaningVi: 'nước' },
  { simplified: '书', meaningVi: 'sách' },
  { simplified: '猫', meaningVi: 'con mèo' },
  { simplified: '大', meaningVi: 'to; lớn' },
];

function choices(steps: SessionStep[]) {
  return steps.filter(
    (s): s is Extract<SessionStep, { kind: 'choice' }> => s.kind === 'choice',
  );
}

describe('buildLessonSession', () => {
  const steps = buildLessonSession(LESSON, POOL, seeded());

  it('giới thiệu MỌI từ, mỗi từ đúng 1 lần, trước câu hỏi đầu tiên về từ đó', () => {
    const intros = steps.filter((s) => s.kind === 'intro').map((s) => s.wordId);
    expect([...intros].sort()).toEqual(LESSON.map((x) => x.id).sort());
    for (const c of choices(steps)) {
      const introAt = steps.findIndex(
        (s) => s.kind === 'intro' && s.wordId === c.wordId,
      );
      expect(introAt).toBeGreaterThanOrEqual(0);
      expect(introAt).toBeLessThan(steps.indexOf(c));
    }
  });

  it('đáp án nằm đúng vị trí, phương án không trùng nhau', () => {
    for (const c of choices(steps)) {
      const word = LESSON.find((x) => x.id === c.wordId)!;
      const expected =
        c.prompt === 'hanzi' ? shortMeaning(word.meaningVi!) : word.simplified;
      expect(c.options[c.answer]).toBe(expected);
      expect(new Set(c.options).size).toBe(c.options.length);
    }
  });

  it('không lấy từ dùng chung chữ Hán làm phương án nhiễu (那里 vs 那儿)', () => {
    for (const c of choices(steps)) {
      const word = LESSON.find((x) => x.id === c.wordId)!;
      if (c.prompt === 'hanzi') continue;
      for (const [i, opt] of c.options.entries()) {
        if (i === c.answer) continue;
        const overlap = Array.from(opt).some((ch) =>
          word.simplified.includes(ch),
        );
        expect(overlap).toBe(false);
      }
    }
  });

  it('ghép cặp không có 2 nghĩa trùng nhau, không 2 từ chung chữ Hán', () => {
    for (const s of steps) {
      if (s.kind !== 'match') continue;
      const group = s.wordIds.map((id) => LESSON.find((x) => x.id === id)!);
      const meanings = group.map((x) => shortMeaning(x.meaningVi!));
      expect(new Set(meanings).size).toBe(meanings.length);
      const chars = group.flatMap((x) => Array.from(new Set(x.simplified)));
      expect(new Set(chars).size).toBe(chars.length);
      expect(s.wordIds.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('câu điền từ cắt đúng quanh từ cần điền, nhiễu không lấy từ cùng bài', () => {
    const sentence = steps.find((s) => s.kind === 'sentence');
    expect(sentence).toBeDefined();
    if (sentence?.kind !== 'sentence') return;
    expect(
      sentence.before + sentence.options[sentence.answer] + sentence.after,
    ).toBe('你觉得怎么样？');
    const lessonHanzi = new Set(LESSON.map((x) => x.simplified));
    sentence.options.forEach((o, i) => {
      if (i !== sentence.answer) expect(lessonHanzi.has(o)).toBe(false);
    });
  });

  it('từ không có audio thì không hỏi dạng nghe', () => {
    const silent = LESSON.map((x) => ({ ...x, audioUrl: null }));
    const s = buildLessonSession(silent, POOL, seeded(3));
    expect(choices(s).some((c) => c.prompt === 'audio')).toBe(false);
  });
});

/** Bài có từ đồng âm (他/她/它 tā), từ cùng nghĩa (很/非常 "rất") và câu điền từ mà
 * nhiễu cùng từ loại cũng vừa câu (这件事我来办 — 干). */
const TRICKY = [
  w('t1', '他', 'anh ấy', { pinyin: 'tā', pos: ['PRONOUN'] }),
  w('t2', '她', 'cô ấy', { pinyin: 'tā', pos: ['PRONOUN'] }),
  w('t3', '它', 'nó', { pinyin: 'tā', pos: ['PRONOUN'] }),
  w('t4', '很', 'rất', { pinyin: 'hěn', pos: ['ADVERB'] }),
  w('t5', '非常', 'rất; vô cùng', { pinyin: 'fēi cháng', pos: ['ADVERB'] }),
  w('t6', '办', 'làm; xử lý', {
    pinyin: 'bàn',
    pos: ['VERB'],
    examples: [
      { zh: '这件事我来办。', pinyin: null, vi: 'Việc này để tôi làm.' },
    ],
  }),
  w('t7', '在', 'ở', { pinyin: 'zài', pos: ['PREPOSITION'] }),
  w('t8', '再', 'lại', { pinyin: 'zài', pos: ['ADVERB'] }),
];
const TRICKY_POOL = [
  { simplified: '干', meaningVi: 'làm', pinyin: 'gàn', pos: ['VERB'] },
  { simplified: '做', meaningVi: 'làm', pinyin: 'zuò', pos: ['VERB'] },
  { simplified: '用', meaningVi: 'dùng', pinyin: 'yòng', pos: ['VERB'] },
  {
    simplified: '桌子',
    meaningVi: 'cái bàn',
    pinyin: 'zhuō zi',
    pos: ['NOUN'],
  },
  {
    simplified: '漂亮',
    meaningVi: 'đẹp',
    pinyin: 'piào liang',
    pos: ['ADJECTIVE'],
  },
  { simplified: '书', meaningVi: 'sách', pinyin: 'shū', pos: ['NOUN'] },
  { simplified: '大', meaningVi: 'to; lớn', pinyin: 'dà', pos: ['ADJECTIVE'] },
];
const byId = new Map(TRICKY.map((x) => [x.id, x]));
const byHanzi = new Map(
  [...TRICKY, ...TRICKY_POOL].map((x) => [x.simplified, x]),
);

describe('phương án nhiễu không được cũng đúng', () => {
  const sessions = Array.from({ length: 30 }, (_, i) =>
    buildLessonSession(TRICKY, TRICKY_POOL, seeded(i + 1)),
  );

  it('hỏi nghe không đưa chữ đồng âm (他/她/它), hỏi nghĩa không đưa từ cùng nghĩa (很/非常)', () => {
    for (const c of sessions.flatMap(choices)) {
      const word = byId.get(c.wordId)!;
      const others = c.options.filter((_, i) => i !== c.answer);
      if (c.prompt === 'audio')
        for (const o of others)
          expect(byHanzi.get(o)?.pinyin).not.toBe(word.pinyin);
      if (c.prompt === 'meaning')
        for (const o of others)
          expect(shortMeaning(byHanzi.get(o)!.meaningVi!)).not.toBe(
            shortMeaning(word.meaningVi!),
          );
    }
  });

  it('câu điền từ không đưa từ cùng từ loại (这件事我来办 — không có 干, 做)', () => {
    const sentences = sessions
      .flat()
      .filter((s) => s.kind === 'sentence' && s.wordId === 't6');
    expect(sentences.length).toBeGreaterThan(0);
    for (const s of sentences) {
      if (s.kind !== 'sentence') continue;
      for (const [i, o] of s.options.entries())
        if (i !== s.answer) expect(byHanzi.get(o)?.pos).not.toContain('VERB');
    }
  });

  it('bài kiểm tra trình độ cũng theo luật đồng âm', () => {
    const pool = [...TRICKY, ...TRICKY_POOL];
    for (let seed = 1; seed <= 20; seed++) {
      const step = buildChoiceStep(TRICKY[0], 'audio', pool, seeded(seed));
      expect(step!.options).not.toContain('她');
      expect(step!.options).not.toContain('它');
    }
  });
});

describe('buildChoiceStep', () => {
  it('đáp án đúng vị trí, nhiễu không dùng chung chữ Hán với đáp án', () => {
    const pool = [
      ...LESSON,
      ...POOL.map((p, i) => w(`p${i}`, p.simplified, p.meaningVi)),
    ];
    for (const prompt of ['hanzi', 'meaning', 'audio'] as const) {
      const target = LESSON[0]; // 那里 — 那儿/哪里 không được làm nhiễu
      const step = buildChoiceStep(target, prompt, pool, seeded(11));
      expect(step).not.toBeNull();
      const expected =
        prompt === 'hanzi'
          ? shortMeaning(target.meaningVi!)
          : target.simplified;
      expect(step!.options[step!.answer]).toBe(expected);
      if (prompt !== 'hanzi')
        for (const o of step!.options)
          if (o !== target.simplified)
            expect(
              Array.from(o).some((c) => target.simplified.includes(c)),
            ).toBe(false);
    }
  });

  it('không có audio thì không tạo câu nghe', () => {
    expect(
      buildChoiceStep({ ...LESSON[0], audioUrl: null }, 'audio', POOL),
    ).toBeNull();
  });
});

describe('shortMeaning', () => {
  it('lấy vế đầu, bỏ chú thích ngoặc', () => {
    expect(shortMeaning('(khái niệm) thời gian')).toBe('thời gian');
    expect(shortMeaning('bạn; anh; chị')).toBe('bạn');
    expect(shortMeaning('(lượng từ)')).toBe('(lượng từ)');
  });
});
