/**
 * ETL: gộp các nguồn mở → data/processed/words.seed.json (dùng cho prisma db seed).
 *
 * KHÔNG chạm database. Chạy: npm run data:build-words
 *
 * Kiến trúc 2 lớp (xem plan mục 1.3):
 *   - Xương sống (từ + pinyin + POS + tần suất + traditional): drkameleon/complete-hsk-vocabulary (MIT)
 *   - Trọng tài phân cấp: Punpuf parser (đại cương thi chính thức 2026)  → chỗ lệch ghi ra level-mismatches.csv
 *   - Nghĩa tiếng Việt: CVDICT (CC BY-SA 4.0) → fallback nghĩa Anh CC-CEDICT (CC BY-SA 3.0)
 *
 * File dataset build ra (words.seed.json) phát hành lại theo CC BY-SA 4.0 vì có
 * chứa dữ liệu phái sinh từ CC-CEDICT/CVDICT. Xem data/NOTICES.md.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexCedict, parseCedict } from './lib/cedict';
import { parseDrkameleon } from './lib/drkameleon';
import { numericToDiacritic, normalizePinyinKey } from './lib/pinyin';
import { indexPunpuf, parsePunpufTsv } from './lib/punpuf';

const RAW = join(__dirname, '..', '..', 'data', 'raw');
const OUT = join(__dirname, '..', '..', 'data', 'processed');

const SRC = {
  drkameleon: join(RAW, 'complete-hsk-vocabulary.json'),
  punpuf: join(RAW, 'hsk-2025-official.tsv'),
  cvdict: join(RAW, 'cvdict.u8'),
  cedict: join(RAW, 'cedict_ts.u8'),
};

function requireFile(path: string, hint: string): string {
  if (!existsSync(path)) {
    console.error(`\n✗ Thiếu file nguồn: ${path}\n  ${hint}\n`);
    console.error('  Xem scripts/import/README.md để biết cách tải, rồi chạy lại.');
    process.exit(1);
  }
  return readFileSync(path, 'utf8');
}

function firstDef(defs: string[]): string | null {
  const d = defs.find((x) => !/^(variant of|see |CL:|old variant)/i.test(x));
  return (d ?? defs[0] ?? '').replace(/\s+/g, ' ').trim() || null;
}

function main(): void {
  const drkRaw = requireFile(
    SRC.drkameleon,
    'Tải complete.json từ github.com/drkameleon/complete-hsk-vocabulary (MIT).',
  );
  const punpufRaw = requireFile(
    SRC.punpuf,
    'Chạy Punpuf/hsk-syllabus-vocabulary-parser trên đại cương HSK 3.0 2026 → TSV.',
  );
  const cvdictRaw = requireFile(SRC.cvdict, 'Tải CVDICT.u8 từ github.com/ph0ngp/CVDICT (CC BY-SA 4.0).');
  const cedictRaw = requireFile(SRC.cedict, 'Tải cedict_ts.u8 từ mdbg.net (CC BY-SA 3.0).');

  const base = parseDrkameleon(JSON.parse(drkRaw));
  const officialLevels = indexPunpuf(parsePunpufTsv(punpufRaw));
  const cvdict = indexCedict(parseCedict(cvdictRaw));
  const cedict = indexCedict(parseCedict(cedictRaw));

  const mismatches: string[] = ['simplified,pinyinKey,drkameleon_level,official_level'];
  let withVi = 0;
  let missingVi = 0;

  const records = base.map((e) => {
    const key = `${e.simplified}|${e.pinyinKey}`;

    // --- cấp: ưu tiên đại cương chính thức ---
    const official = officialLevels.get(key) ?? officialLevels.get(e.simplified);
    let hskLevel = e.hskLevel ?? 7;
    let bandOnly = hskLevel >= 7;
    let levelSource = 'drkameleon';
    if (official) {
      if (official.level !== e.hskLevel) {
        mismatches.push(`${e.simplified},${e.pinyinKey},${e.hskLevel ?? ''},${official.level}`);
      }
      hskLevel = official.level;
      bandOnly = official.bandOnly;
      levelSource = 'punpuf';
    }

    // --- nghĩa tiếng Việt: CVDICT → fallback EN CC-CEDICT ---
    const viEntry = cvdict.get(key) ?? cvdict.get(e.simplified);
    const enEntry = cedict.get(key) ?? cedict.get(e.simplified);
    const meaningVi = viEntry ? firstDef(viEntry.defs) : null;
    const meaningEn = firstDef(e.meaningsEn) ?? (enEntry ? firstDef(enEntry.defs) : null);
    if (meaningVi) withVi += 1;
    else missingVi += 1;

    return {
      simplified: e.simplified,
      traditional: e.traditional ?? enEntry?.traditional ?? null,
      pinyin: e.pinyinNumeric ? numericToDiacritic(e.pinyinNumeric) : '',
      pinyinNumeric: normalizePinyinKey(e.pinyinNumeric),
      hskLevel,
      hskBandOnly: bandOnly,
      pos: e.pos,
      frequencyRank: e.frequencyRank,
      radical: e.radical,
      meaningVi,
      meaningEn,
      translationStatus: meaningVi ? 'MACHINE' : 'MISSING',
      needsReview: true,
      source: `drkameleon; lvl:${levelSource}; vi:${viEntry ? 'cvdict' : 'none'}`,
    };
  });

  // dedupe theo (simplified, pinyinNumeric)
  const seen = new Set<string>();
  const deduped = records.filter((r) => {
    const k = `${r.simplified}|${r.pinyinNumeric}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  writeFileSync(join(OUT, 'words.seed.json'), JSON.stringify(deduped, null, 2));
  writeFileSync(join(OUT, 'level-mismatches.csv'), mismatches.join('\n'));

  const byLevel = new Map<number, number>();
  for (const r of deduped) byLevel.set(r.hskLevel, (byLevel.get(r.hskLevel) ?? 0) + 1);
  const report = [
    '# Báo cáo build words.seed.json',
    '',
    `- Tổng số từ: ${deduped.length}`,
    `- Có nghĩa tiếng Việt (CVDICT): ${withVi} (${((withVi / deduped.length) * 100).toFixed(1)}%)`,
    `- Thiếu nghĩa tiếng Việt (cần dịch): ${missingVi}`,
    `- Chỗ lệch cấp giữa nguồn: ${mismatches.length - 1} (xem level-mismatches.csv)`,
    '',
    '## Số từ theo cấp',
    ...[...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([lv, n]) => `- HSK ${lv}: ${n}`),
    '',
    '## Giấy phép',
    '- words.seed.json: CC BY-SA 4.0 (phái sinh từ CC-CEDICT / CVDICT). Xem data/NOTICES.md.',
  ].join('\n');
  writeFileSync(join(OUT, 'build-report.md'), report);

  console.log(report);
}

main();
