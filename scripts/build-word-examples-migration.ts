/**
 * Dựng migration nạp câu ví dụ Hanni tự soạn (`prisma/seed/data/word-examples-hsk{N}.json`)
 * lên production — CI chỉ chạy `prisma migrate deploy`, không chạy script tay. Mỗi câu 1
 * lệnh INSERT … SELECT theo (simplified, pinyinNumeric), CHỈ chèn khi từ chưa có câu ví dụ
 * nào (không đè dữ liệu đã có). Pinyin sinh bằng `examplePinyin()` (từ điển Hanni + luật
 * đa âm); câu nào soát thấy sai thì ghi tay ở phần tử thứ 5 của mục đó.
 *
 * Chạy: npx tsx scripts/build-word-examples-migration.ts <thư-mục-migration> <cấp...>
 * `--fix=<cấp>`: cấp ĐÃ có câu trên production (nạp bằng `pinyin-pro` thuần) — chỉ UPDATE
 * pinyin những câu đọc sai, khi giá trị hiện tại đúng bằng giá trị cũ.
 * Thêm `--review` để in câu có chữ đa âm kèm pinyin (soát bằng mắt trước khi ghi).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pinyin } from 'pinyin-pro';
import {
  examplePinyin,
  pinyinOverrides,
} from '../src/modules/vocabulary/example-pinyin.util';

type Entry = [string, string, string, string, string?];

const root = join(__dirname, '..');
const read = <T>(p: string) =>
  JSON.parse(readFileSync(join(root, p), 'utf8')) as T;

export function loadOverrides() {
  const words = read<
    { simplified: string; pinyinNumeric: string; pinyin: string }[]
  >('data/processed/words.seed.json');
  // Pinyin hiển thị đã sửa tay (好处 hǎo chu, 说法 shuō fǎ…) — giống giá trị trên production.
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

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** Cách `seed-word-examples.ts` từng sinh pinyin (pinyin-pro thuần) — giá trị đang có trên production. */
function legacyPinyin(zh: string): string {
  return pinyin(zh, { toneType: 'symbol', nonZh: 'consecutive' })
    .replace(/\s*。\s*/g, '.')
    .replace(/\s*，\s*/g, ', ')
    .replace(/\s*？\s*/g, '?')
    .replace(/\s*！\s*/g, '!')
    .trim();
}
const RISKY =
  /[得地着了还长教好只为乐觉行重发种便当少差大和数相空应调量背处干场假看都要会中]/u;

function main() {
  const [dir, ...rest] = process.argv.slice(2);
  const review = rest.includes('--review');
  const levels = rest.filter((a) => /^\d$/.test(a)).map(Number);
  const fix =
    rest
      .find((a) => a.startsWith('--fix='))
      ?.slice(6)
      .split(',')
      .map(Number) ?? [];
  const overrides = loadOverrides();
  const lines = [
    `-- Câu ví dụ Hanni tự soạn cho HSK ${levels.join(', ')} (không qua dịch máy), sinh bởi`,
    `-- scripts/build-word-examples-migration.ts. Chỉ chèn cho từ CHƯA có câu ví dụ nào.`,
  ];
  for (const level of levels) {
    const entries = read<Entry[]>(
      `prisma/seed/data/word-examples-hsk${level}.json`,
    );
    for (const [simplified, pinyinNumeric, zh, vi, manual] of entries) {
      const py = manual ?? examplePinyin(zh, overrides);
      if (review && (RISKY.test(zh) || manual))
        console.log(`${simplified}\t${zh}\t${py}${manual ? '\t(tay)' : ''}`);
      lines.push(
        `INSERT INTO "WordExample" ("id", "wordId", "zh", "pinyin", "vi", "orderIndex", "source") ` +
          `SELECT gen_random_uuid(), w."id", ${q(zh)}, ${q(py)}, ${q(vi)}, 0, ${q(`Hanni soạn (2026-10)`)} ` +
          `FROM "Word" w WHERE w."simplified" = ${q(simplified)} AND w."pinyinNumeric" = ${q(pinyinNumeric)} ` +
          `AND NOT EXISTS (SELECT 1 FROM "WordExample" e WHERE e."wordId" = w."id");`,
      );
    }
  }
  for (const level of fix) {
    const entries = read<Entry[]>(
      `prisma/seed/data/word-examples-hsk${level}.json`,
    );
    let changed = 0;
    for (const [simplified, pinyinNumeric, zh, , manual] of entries) {
      const before = legacyPinyin(zh);
      const after = manual ?? examplePinyin(zh, overrides);
      if (before === after) continue;
      changed++;
      if (review) console.log(`${simplified}\t${zh}\t${before} → ${after}`);
      lines.push(
        `UPDATE "WordExample" e SET "pinyin" = ${q(after)} FROM "Word" w WHERE e."wordId" = w."id" ` +
          `AND w."simplified" = ${q(simplified)} AND w."pinyinNumeric" = ${q(pinyinNumeric)} ` +
          `AND e."zh" = ${q(zh)} AND e."pinyin" = ${q(before)};`,
      );
    }
    lines.splice(
      2,
      0,
      `-- Sửa pinyin ${changed} câu ví dụ HSK ${level} (pinyin-pro thuần đọc sai: 说得 "dé", 哪儿 "nǎ ér", 朋友 "péng yǒu"…).`,
    );
  }
  if (dir && dir !== '-') {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, 'migration.sql'), lines.join('\n') + '\n');
    const statements = lines.filter((l) => !l.startsWith('--')).length;
    console.log(`đã ghi ${statements} lệnh vào ${dir}/migration.sql`);
  }
}

if (require.main === module) main();
