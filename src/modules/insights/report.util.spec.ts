import {
  buildCoachPrompt,
  buildSeries,
  parseCoachJson,
  periodRange,
  type PeriodStats,
} from './report.util';

const stats = (over: Partial<PeriodStats> = {}): PeriodStats => ({
  daysStudied: 0,
  minutes: 0,
  reviews: 0,
  newWords: 0,
  retention: null,
  lessons: 0,
  listening: { total: 0, correct: 0 },
  speaking: 0,
  mockExams: { count: 0, bestPercent: null },
  ...over,
});

describe('periodRange', () => {
  it('tuần bắt đầu Thứ Hai; so cùng số ngày đầu tuần trước', () => {
    // 2026-10-17 là Thứ Bảy.
    expect(periodRange('2026-10-17', 'week', 0)).toEqual({
      startIso: '2026-10-12',
      endIso: '2026-10-17',
      periodEndIso: '2026-10-18',
      prevStartIso: '2026-10-05',
      prevEndIso: '2026-10-10',
    });
  });

  it('kỳ trước là trọn kỳ, so với trọn kỳ trước nữa', () => {
    expect(periodRange('2026-10-17', 'week', 1)).toEqual({
      startIso: '2026-10-05',
      endIso: '2026-10-11',
      periodEndIso: '2026-10-11',
      prevStartIso: '2026-09-28',
      prevEndIso: '2026-10-04',
    });
    expect(periodRange('2026-10-17', 'quarter', 1)).toEqual({
      startIso: '2026-07-01',
      endIso: '2026-09-30',
      periodEndIso: '2026-09-30',
      prevStartIso: '2026-04-01',
      prevEndIso: '2026-06-30',
    });
  });

  it('cùng kỳ tháng trước không tràn sang tháng này (31/3 so với cả tháng 2)', () => {
    const r = periodRange('2026-03-31', 'month', 0);
    expect(r.startIso).toBe('2026-03-01');
    expect(r.prevStartIso).toBe('2026-02-01');
    expect(r.prevEndIso).toBe('2026-02-28');
  });

  it('quý này tính từ ngày 1 của quý', () => {
    const r = periodRange('2026-10-17', 'quarter', 0);
    expect(r).toMatchObject({
      startIso: '2026-10-01',
      endIso: '2026-10-17',
      periodEndIso: '2026-12-31',
      prevStartIso: '2026-07-01',
      prevEndIso: '2026-07-17',
    });
  });
});

describe('buildSeries', () => {
  it('tuần: 7 cột theo ngày, cả ngày chưa tới', () => {
    const range = periodRange('2026-10-17', 'week', 0);
    const s = buildSeries(range, 'week', [
      { iso: '2026-10-13', minutes: 12.4, reviews: 30 },
      { iso: '2026-10-17', minutes: 5, reviews: 8 },
    ]);
    expect(s).toHaveLength(7);
    expect(s[1]).toEqual({
      startIso: '2026-10-13',
      endIso: '2026-10-13',
      minutes: 12,
      reviews: 30,
    });
    expect(s[6].reviews).toBe(0);
  });

  it('quý: gộp 7 ngày/cột, không mất ngày nào', () => {
    const range = periodRange('2026-10-17', 'quarter', 0);
    const s = buildSeries(range, 'quarter', [
      { iso: '2026-10-01', minutes: 10, reviews: 5 },
      { iso: '2026-10-07', minutes: 10, reviews: 5 },
      { iso: '2026-10-08', minutes: 1, reviews: 1 },
      { iso: '2026-12-31', minutes: 3, reviews: 2 },
    ]);
    // 92 ngày = 13 cột đủ 7 ngày + 1 cột 1 ngày.
    expect(s).toHaveLength(14);
    expect(s[0]).toMatchObject({
      startIso: '2026-10-01',
      endIso: '2026-10-07',
      reviews: 10,
    });
    expect(s[1].reviews).toBe(1);
    expect(s[13]).toMatchObject({
      startIso: '2026-12-31',
      endIso: '2026-12-31',
      reviews: 2,
    });
  });
});

describe('buildCoachPrompt', () => {
  it('đưa đúng số liệu, % đã tính sẵn, phần thi yếu có tên dạng câu', () => {
    const prompt = buildCoachPrompt({
      period: 'week',
      offset: 0,
      range: periodRange('2026-10-17', 'week', 0),
      courseLevel: 2,
      current: stats({ daysStudied: 4, reviews: 180, retention: 78 }),
      previous: stats({ daysStudied: 2, reviews: 60 }),
      streak: { current: 3, longest: 5 },
      dueNow: 12,
      weakParts: [
        {
          level: 1,
          section: 'listening',
          part: 3,
          type: 'match-picture',
          correct: 4,
          total: 10,
        },
      ],
      hardWords: [
        {
          simplified: '便宜',
          pinyin: 'pián yi',
          hanViet: 'tiện nghi',
          meaningVi: 'rẻ',
          forgot: 3,
        },
      ],
      familiar: { count: 0, examples: [] },
    });
    expect(prompt).toContain('tuần này');
    expect(prompt).toContain('"tiLeNhoKhiOn":"78%"');
    expect(prompt).toContain('"tiLeNhoKhiOn":"chưa đủ lượt ôn"');
    expect(prompt).toContain('HSK 1 · Nghe phần 3 (ghép tranh): đúng 4/10');
    expect(prompt).toContain('"amHanViet":"tiện nghi"');
    expect(prompt).toContain('"capHskDangHoc":"HSK 2"');
    expect(prompt).toContain('"tuDaQuenNhoHanViet":"không có"');
  });
});

describe('parseCoachJson', () => {
  it('giữ đúng khuôn, bỏ phần tử sai kiểu, chặn số mục', () => {
    const r = parseCoachJson(
      JSON.stringify({
        overview: ' Tuần này bạn học 4/6 ngày. ',
        wins: ['a', '', 3, 'b', 'c', 'd'],
        watch: [],
        mnemonics: [{ zh: '便宜', tip: 'tiện nghi thì rẻ' }, { zh: '疼' }],
        plan: ['x', 'y', 'z', 't'],
      }),
    );
    expect(r).toEqual({
      overview: 'Tuần này bạn học 4/6 ngày.',
      wins: ['a', 'b', 'c'],
      watch: [],
      mnemonics: [{ zh: '便宜', tip: 'tiện nghi thì rẻ' }],
      plan: ['x', 'y', 'z'],
    });
  });

  it('thiếu tổng quan hoặc JSON hỏng thì null', () => {
    expect(parseCoachJson(JSON.stringify({ wins: ['a'] }))).toBeNull();
    expect(parseCoachJson('{')).toBeNull();
  });
});
