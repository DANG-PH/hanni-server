import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { In, type DataSource } from 'typeorm';
import {
  examplePinyin,
  pinyinOverrides,
} from '../../modules/vocabulary/example-pinyin.util';
import { Word, WordExample } from '../entities';

/** 1 câu ví dụ: [mặt chữ, pinyin số của từ, câu tiếng Trung, nghĩa tiếng Việt, pinyin soát tay?] */
export type ExampleEntry = [
  simplified: string,
  pinyinNumeric: string,
  zh: string,
  vi: string,
  /** pinyin soát tay khi cách sinh tự động đọc sai (vd 高兴地 "de") */
  pinyin?: string,
];

const ROOT = join(__dirname, '..', '..', '..');
const read = <T>(path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as T;

/** Câu ví dụ Hanni tự soạn theo cấp (không qua dịch máy). */
export const EXAMPLE_FILES: { level: number; file: string; source: string }[] =
  [
    {
      level: 1,
      file: 'src/database/seed/data/word-examples-hsk1.json',
      source: 'Hanni soạn (2026-09)',
    },
    {
      level: 2,
      file: 'src/database/seed/data/word-examples-hsk2.json',
      source: 'Hanni soạn (2026-10)',
    },
    {
      level: 3,
      file: 'src/database/seed/data/word-examples-hsk3.json',
      source: 'Hanni soạn (2026-10)',
    },
    {
      level: 4,
      file: 'src/database/seed/data/word-examples-hsk4.json',
      source: 'Hanni soạn (2026-10)',
    },
  ];

export const readExamples = (file: string) => read<ExampleEntry[]>(file);

/** Bảng đọc pinyin theo từ điển Hanni (kèm pinyin hiển thị đã sửa tay: 好处 hǎo chu, 说法 shuō fǎ…). */
export function loadExampleOverrides() {
  const words = read<
    { simplified: string; pinyinNumeric: string; pinyin: string }[]
  >('data/processed/words.seed.json');
  const fixes = new Map(
    read<{ simplified: string; pinyinNumeric: string; pinyin?: string }[]>(
      'data/curated/meaning-fixes.json',
    )
      .filter((f) => f.pinyin)
      .map((f) => [`${f.simplified}|${f.pinyinNumeric}`, f.pinyin!]),
  );
  return pinyinOverrides(
    words.map((w) => ({
      simplified: w.simplified,
      pinyin: fixes.get(`${w.simplified}|${w.pinyinNumeric}`) ?? w.pinyin,
    })),
  );
}

/**
 * Nạp câu ví dụ HSK 1–3 cho từ vựng. Khớp từ theo (mặt chữ, pinyin số); xoá câu cũ của đúng các từ trong
 * file rồi tạo lại — không đụng từ khác. Pinyin sinh bằng `examplePinyin()` (từ điển Hanni + luật đa âm).
 * Production đã nạp bằng migration; ở đây cho DB mới. Chạy lại vô hại.
 */
export async function seedWordExamples(db: DataSource): Promise<void> {
  const overrides = loadExampleOverrides();
  const words = db.getRepository(Word);
  const examples = db.getRepository(WordExample);
  for (const { file, source } of EXAMPLE_FILES) {
    const entries = readExamples(file);
    const found = await words.find({
      where: entries.map(([simplified, pinyinNumeric]) => ({
        simplified,
        pinyinNumeric,
      })),
      select: { id: true, simplified: true, pinyinNumeric: true },
    });
    const idOf = new Map(
      found.map((w) => [`${w.simplified}|${w.pinyinNumeric}`, w.id]),
    );
    const rows = entries.flatMap(
      ([simplified, pinyinNumeric, zh, vi, manual]) => {
        const wordId = idOf.get(`${simplified}|${pinyinNumeric}`);
        return wordId
          ? [
              {
                wordId,
                zh,
                pinyin: manual ?? examplePinyin(zh, overrides),
                vi,
                orderIndex: 0,
                source,
              },
            ]
          : [];
      },
    );
    if (rows.length < entries.length)
      console.log(
        `  ⚠ ${entries.length - rows.length}/${entries.length} từ không khớp Word nào (bỏ qua)`,
      );
    await examples.delete({ wordId: In(rows.map((r) => r.wordId)) });
    await examples.insert(rows);
    console.log(`  ✓ ${rows.length}/${entries.length} câu ví dụ (${file})`);
  }
}
