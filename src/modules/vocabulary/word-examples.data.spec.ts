import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Soát câu ví dụ Hanni tự soạn (`src/database/seed/data/word-examples-hsk{N}.json`): câu chứa
 * đúng từ cần minh hoạ, mọi chữ Hán nằm trong từ vựng HSK ≤ N (người học cấp N đọc được
 * cả câu — cùng cách soát đề thi thử), phủ đủ từ của cấp, dấu câu đầy đủ.
 * HSK 1 soạn trước khi có luật chữ theo cấp (dùng cả 每, 等, 咖啡…) nên chỉ soát khoá.
 */
type Entry = [
  simplified: string,
  pinyinNumeric: string,
  zh: string,
  vi: string,
  pinyin?: string,
];

const root = join(__dirname, '..', '..', '..');
const words = JSON.parse(
  readFileSync(join(root, 'data/processed/words.seed.json'), 'utf8'),
) as { simplified: string; pinyinNumeric: string; hskLevel: number }[];
const HAN = /\p{Script=Han}/u;

function charsUpTo(level: number): Set<string> {
  const set = new Set<string>();
  for (const w of words)
    if (w.hskLevel <= level)
      for (const c of w.simplified) if (HAN.test(c)) set.add(c);
  return set;
}

/** 有时（候） → ["有时候", "有时"]: chữ trong ngoặc có thể bỏ. */
function forms(simplified: string): string[] {
  if (!/[（(]/.test(simplified)) return [simplified];
  return [
    simplified.replace(/[（()）]/g, ''),
    simplified.replace(/[（(][^）)]*[）)]/g, ''),
  ];
}

describe.each([1, 2, 3])('câu ví dụ HSK %i', (level) => {
  let entries: Entry[] = [];
  try {
    entries = JSON.parse(
      readFileSync(
        join(root, `src/database/seed/data/word-examples-hsk${level}.json`),
        'utf8',
      ),
    ) as Entry[];
  } catch {
    entries = [];
  }
  const ofLevel = words.filter((w) => w.hskLevel === level);
  const allowed = charsUpTo(level);

  it('phủ đủ từ của cấp, không trùng, đúng khoá từ điển', () => {
    if (!entries.length) return;
    const keys = entries.map(([s, p]) => `${s}|${p}`);
    expect(new Set(keys).size).toBe(keys.length);
    const valid = new Set(
      ofLevel.map((w) => `${w.simplified}|${w.pinyinNumeric}`),
    );
    expect(keys.filter((k) => !valid.has(k))).toEqual([]);
    expect([...valid].filter((k) => !keys.includes(k))).toEqual([]);
  });

  (level === 1 ? it.skip : it)(
    'câu chứa đúng từ, chỉ dùng chữ HSK ≤ cấp, đủ dấu câu',
    () => {
      const bad: string[] = [];
      for (const [s, , zh, vi] of entries) {
        if (!forms(s).some((f) => zh.includes(f)))
          bad.push(`${s}: câu không chứa từ — ${zh}`);
        const outside = [...zh].filter((c) => HAN.test(c) && !allowed.has(c));
        if (outside.length)
          bad.push(`${s}: chữ vượt cấp ${outside.join('')} — ${zh}`);
        if (!/[。！？”]$/u.test(zh))
          bad.push(`${s}: thiếu dấu câu cuối — ${zh}`);
        if (!/[.!?”]$/u.test(vi.trim()))
          bad.push(`${s}: nghĩa thiếu dấu câu — ${vi}`);
      }
      expect(bad).toEqual([]);
    },
  );
});
