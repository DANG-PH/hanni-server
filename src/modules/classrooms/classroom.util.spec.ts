import {
  CODE_ALPHABET,
  CODE_LENGTH,
  isAssignmentDone,
  makeClassCode,
  normalizeClassCode,
} from './classroom.util';

describe('mã lớp', () => {
  it('đủ 6 ký tự, không có chữ dễ nhầm 0/O/1/I/L', () => {
    for (let i = 0; i < 200; i++) {
      const code = makeClassCode();
      expect(code).toHaveLength(CODE_LENGTH);
      for (const c of code) expect(CODE_ALPHABET).toContain(c);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('chuẩn hoá mã người dùng gõ', () => {
    expect(normalizeClassCode(' hn4k-7p ')).toBe('HN4K7P');
    expect(normalizeClassCode('HN 4K 7P extra')).toBe('HN4K7P');
    expect(normalizeClassCode('---')).toBe('');
  });
});

describe('isAssignmentDone', () => {
  const at = new Date('2026-10-19T08:00:00Z');
  it('bài học: xong khi đã hoàn thành bài, kể cả trước lúc giao', () => {
    const a = {
      kind: 'LESSON' as const,
      lessonId: 'L1',
      examSlug: null,
      createdAt: at,
    };
    expect(isAssignmentDone(a, new Set(['L1']), [])).toBe(true);
    expect(isAssignmentDone(a, new Set(['L2']), [])).toBe(false);
  });

  it('đề thi thử: chỉ tính lượt làm SAU lúc giao, đúng đề', () => {
    const a = {
      kind: 'MOCK_EXAM' as const,
      lessonId: null,
      examSlug: 'hsk1-de-1',
      createdAt: at,
    };
    const before = {
      examSlug: 'hsk1-de-1',
      createdAt: new Date('2026-10-18T08:00:00Z'),
    };
    const after = {
      examSlug: 'hsk1-de-1',
      createdAt: new Date('2026-10-19T09:00:00Z'),
    };
    const other = {
      examSlug: 'hsk1-de-2',
      createdAt: new Date('2026-10-19T09:00:00Z'),
    };
    expect(isAssignmentDone(a, new Set(), [before])).toBe(false);
    expect(isAssignmentDone(a, new Set(), [other])).toBe(false);
    expect(isAssignmentDone(a, new Set(), [before, after])).toBe(true);
  });
});
