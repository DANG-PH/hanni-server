/**
 * ETL: gộp nguồn mở → data/processed/words.seed.json (dùng cho `prisma db seed`).
 * KHÔNG chạm database. Chạy: npm run data:build-words
 *
 * Nguồn (đều CC BY-SA 4.0 — xem data/NOTICES.md):
 *   - krmanik/HSK-3.0 (2025-11): đại cương chính thức (cấp + pinyin + từ loại),
 *     bản dịch Anh theo từng cấp, all_cedict.json, tần suất BCC, audio phát âm.
 *   - ph0ngp/CVDICT: nghĩa tiếng Việt (dịch máy GPT-4o có rà soát một phần).
 *   - data/curated/hsk1.json: 70 từ HSK 1 nghĩa tiếng Việt đã rà tay + câu ví dụ.
 *
 * File build ra phát hành lại theo CC BY-SA 4.0 (điều khoản share-alike).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexCedict, parseCedict } from './lib/cedict';
import {
  hanVietOf,
  loadHanVietOverrides,
  loadHanVietSupplement,
  parseUnihanVietnamese,
} from './lib/hanviet';
import {
  parseAllCedict,
  parseFrequency,
  parseSyllabus,
  parseWordTsvs,
} from './lib/krmanik';
import { normalizePinyinKey, numericToDiacritic, stripTones } from './lib/pinyin';
import { mapPos } from './lib/pos-map';

const RAW = join(__dirname, '..', '..', 'data', 'raw');
const OUT = join(__dirname, '..', '..', 'data', 'processed');
const CURATED_DIR = join(__dirname, '..', '..', 'data', 'curated');
const CURATED = join(CURATED_DIR, 'hsk1.json');
const KRM = join(RAW, 'krmanik-hsk3');
const CVDICT_FILE = join(RAW, 'cvdict', 'CVDICT.u8');
const UNIHAN_FILE = join(RAW, 'unihan', 'Unihan_Readings.txt');

interface LessonThemeFile {
  themeOrder: string[];
  themeNames: Record<string, string>;
  wordThemes: { simplified: string; pinyinNumeric: string; theme: string }[];
}

/** Đọc file chủ đề bài học đã soạn tay cho 1 cấp, nếu có (data/curated/lesson-themes-hsk{level}.json). */
function loadLessonThemes(level: number): LessonThemeFile | null {
  const path = join(CURATED_DIR, `lesson-themes-hsk${level}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as LessonThemeFile;
}

function need(path: string, hint: string): void {
  if (!existsSync(path)) {
    console.error(`\n✗ Thiếu: ${path}\n  ${hint}`);
    console.error('  Chạy: npx tsx scripts/import/fetch-sources.ts');
    process.exit(1);
  }
}

/** Chuẩn hoá pinyin để so khớp: bỏ khoảng trắng, về chữ thường. Giữ NGUYÊN
 * dấu thanh — đó chính là thứ phân biệt gè với gě. */
function comparablePinyin(p: string): string {
  return (p || '').replace(/\s+/g, '').trim().toLowerCase();
}

function cleanDef(def: string): string {
  return (
    def
      // Chú thích LƯỢNG TỪ của CEDICT lọt sang bản dịch tiếng Việt, vd
      // "thế giới (LT:個|个[ge4])" hay "khủng long; LT:頭|头[tou2]" — người
      // học Việt đọc không hiểu gì, lại rơi đúng vào những từ rất thông
      // dụng (世界, 猫, 路, 菜). Đo 2026-09-22: 22/10.894 từ dính.
      .replace(/\s*\(LT:[^)]*\)/g, '')
      .replace(/\s*;?\s*LT:\s*\S+/g, '')
      .replace(/\s*;\s*$/, '')
      .replace(/\s+/g, ' ')
      .replace(/;\s*/g, '; ')
      .trim()
  );
}

/** Gọn nghĩa tiếng Anh Pleco (đôi khi liệt kê 15 từ đồng nghĩa). */
function trimMeaning(def: string | null): string | null {
  if (!def) return null;
  const parts = def.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  let out = parts.slice(0, 6).join(', ');
  if (out.length > 140) out = out.slice(0, 137).replace(/[,\s]+\S*$/, '') + '…';
  return out || null;
}

interface CuratedEntry {
  simplified: string;
  pinyinNumeric: string;
  meaningVi?: string | null;
  examples?: unknown[];
}

function main(): void {
  need(join(KRM, 'syllabus.tsv'), 'Clone krmanik/HSK-3.0.');
  need(CVDICT_FILE, 'Clone ph0ngp/CVDICT.');
  need(UNIHAN_FILE, 'Chạy fetch-sources.ts để tải Unihan Database.');

  const syllabus = parseSyllabus(KRM);
  const tsvByWord = parseWordTsvs(KRM);
  const freq = parseFrequency(KRM);
  const cedict = parseAllCedict(KRM); // simplified -> {traditional, pinyin[], definitions}
  const cvdict = indexCedict(parseCedict(readFileSync(CVDICT_FILE, 'utf8')));

  // Âm Hán Việt: Unihan làm nền, bù thêm ~150 chữ phổ biến Unihan còn thiếu
  // (xem lib/hanviet.ts) — supplement CHỈ điền chỗ Unihan CHƯA CÓ, không ghi
  // đè dữ liệu nguồn đã có (tôn trọng nguồn chính, tránh lộn xộn 2 nguồn).
  const hanVietMap = parseUnihanVietnamese(UNIHAN_FILE);
  let hanVietFilled = 0;
  for (const [char, reading] of loadHanVietSupplement(CURATED_DIR)) {
    if (!hanVietMap.has(char)) {
      hanVietMap.set(char, reading);
      hanVietFilled += 1;
    }
  }
  const hanVietOverrides = loadHanVietOverrides(CURATED_DIR);
  for (const [char, reading] of hanVietOverrides) hanVietMap.set(char, reading);
  console.log(
    `  Hán Việt: ${hanVietMap.size} ký tự (${hanVietFilled} từ supplement, ${hanVietOverrides.size} ghi đè)`,
  );

  const audioWords = existsSync(join(KRM, 'audio-words.txt'))
    ? new Set(
        readFileSync(join(KRM, 'audio-words.txt'), 'utf8')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  const curated = new Map<string, CuratedEntry>();
  if (existsSync(CURATED)) {
    for (const c of JSON.parse(readFileSync(CURATED, 'utf8')) as CuratedEntry[]) {
      curated.set(`${c.simplified}|${c.pinyinNumeric}`, c);
    }
  }

  // xếp hạng tần suất toàn cục
  const rankOf = new Map<string, number>();
  [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([w], i) => rankOf.set(w, i + 1));

  let withVi = 0;
  let missingVi = 0;
  let withAudio = 0;
  let hanVietCount = 0;
  const byKey = new Map<string, Record<string, unknown>>();
  const records: Record<string, unknown>[] = [];

  for (const row of syllabus) {
    const simp = row.simplified;
    const toneless = stripTones(row.pinyinDiacritic);

    // --- pinyin số: khớp cách đọc trong đại cương với CC-CEDICT ---
    const ced = cedict.get(simp);
    let pinyinNumeric: string;
    let pinyinDisplay: string;
    let traditional: string | null = null;
    if (ced) {
      traditional = ced.traditional || null;
      // Khớp GIỮ NGUYÊN dấu thanh trước, chỉ bỏ thanh khi không còn cách nào.
      //
      // Trước 2026-09-22 chỉ có nhánh bỏ-thanh, nên với chữ ĐA ÂM mà 2 cách
      // đọc chung phụ âm+vần thì `.find()` lấy đại cái ĐẦU TIÊN trong mảng
      // CC-CEDICT — trong khi đại cương HSK đã ghi sẵn đúng thanh điệu.
      // Hậu quả thật: 个 lấy "ge3" (gě, chỉ dùng trong 自个儿) thay vì "ge4"
      // (gè — lượng từ thông dụng nhất tiếng Trung); 那 lấy nǎ thay vì nà;
      // 草 lấy cào (biến thể tục) thay vì cǎo. Nghĩa tiếng Việt tra theo
      // `simplified|pinyinNumeric` nên cũng sai theo.
      //
      // So sánh bỏ khoảng trắng + không phân biệt hoa thường: đại cương viết
      // liền ("bàba"), CC-CEDICT tách âm tiết ("bà ba") và viết hoa tên riêng
      // ("Na1").
      const wanted = comparablePinyin(row.pinyinDiacritic);
      const match =
        (wanted &&
          ced.pinyin.find(
            (p) => comparablePinyin(numericToDiacritic(p)) === wanted,
          )) ||
        (toneless &&
          ced.pinyin.find(
            (p) => stripTones(numericToDiacritic(p)) === toneless,
          )) ||
        ced.pinyin[0];
      pinyinNumeric = normalizePinyinKey(match);
      pinyinDisplay = numericToDiacritic(match); // spacing chuẩn "nǐ hǎo"
    } else {
      pinyinNumeric = toneless || simp;
      pinyinDisplay = row.pinyinDiacritic || simp;
    }

    const key = `${simp}|${pinyinNumeric}`;
    const existing = byKey.get(key);
    if (existing) {
      // gộp từ loại của các nghĩa khác nhau (本1 量 + 本2 名 → [MEASURE, NOUN])
      const merged = new Set([
        ...(existing.pos as string[]),
        ...mapPos(row.posRaw),
      ]);
      existing.pos = [...merged];
      continue;
    }

    // --- nghĩa ---
    const tsv = tsvByWord.get(simp);
    if (!traditional) traditional = tsv?.traditional || null;
    const meaningEn = trimMeaning(
      (tsv?.meaningEn && cleanDef(tsv.meaningEn)) ||
        (ced && cleanDef(Object.values(ced.definitions)[0] ?? '')) ||
        null,
    );

    const viEntry = cvdict.get(key) ?? cvdict.get(simp);
    let meaningVi = viEntry ? cleanDef(viEntry.defs[0] ?? '') || null : null;
    let translationStatus = meaningVi ? 'MACHINE' : 'MISSING';

    const cur = curated.get(key) ?? curated.get(`${simp}|${normalizePinyinKey(pinyinNumeric)}`);
    let examples: unknown[] | undefined;
    if (cur) {
      if (cur.meaningVi) {
        meaningVi = cur.meaningVi;
        translationStatus = 'REVIEWED';
      }
      if (cur.examples?.length) examples = cur.examples;
    }

    if (meaningVi) withVi += 1;
    else missingVi += 1;

    // --- audio ---
    const hasAudio = audioWords ? audioWords.has(simp) : true;
    if (hasAudio) withAudio += 1;

    const hanViet = hanVietOf(simp, traditional, hanVietMap);
    if (hanViet) hanVietCount += 1;

    const record: Record<string, unknown> = {
      simplified: simp,
      traditional,
      pinyin: pinyinDisplay,
      pinyinNumeric,
      hskLevel: row.hskLevel,
      hskBandOnly: row.hskBandOnly,
      pos: mapPos(row.posRaw),
      frequencyRank: rankOf.get(simp) ?? null,
      meaningVi,
      meaningEn,
      hanViet,
      translationStatus,
      needsReview: translationStatus !== 'REVIEWED',
      audioUrl: hasAudio ? `/media/audio/cmn-${simp}.mp3` : null,
      source: `krmanik/HSK-3.0@2025-11; vi:${cur?.meaningVi ? 'curated' : viEntry ? 'cvdict' : 'none'}`,
      ...(examples ? { examples } : {}),
    };
    record.origIndex = row.index;
    records.push(record);
    byKey.set(key, record);
  }

  // --- chia bài học: mỗi cấp gom ~LESSON_SIZE từ, sắp theo tần suất (thiếu -> cuối) ---
  // Cấp có file data/curated/lesson-themes-hsk{level}.json thì nhóm theo CHỦ ĐỀ trước
  // (thứ tự chủ đề soạn tay), trong mỗi chủ đề vẫn sắp theo tần suất; cấp chưa có file
  // thì giữ cách chia đều theo tần suất như cũ (title rỗng, lessons.ts tự đặt "Bài N").
  const LESSON_SIZE = 15;
  const MAX_THEME_LESSON = 16;
  const byLvl = new Map<number, Record<string, unknown>[]>();
  for (const r of records) {
    const lv = r.hskLevel as number;
    if (!byLvl.has(lv)) byLvl.set(lv, []);
    byLvl.get(lv)!.push(r);
  }
  let lessonTotal = 0;
  for (const [lv, list] of byLvl) {
    list.sort((a, b) => {
      const fa = (a.frequencyRank as number | null) ?? Number.MAX_SAFE_INTEGER;
      const fb = (b.frequencyRank as number | null) ?? Number.MAX_SAFE_INTEGER;
      return fa - fb || (a.origIndex as number) - (b.origIndex as number);
    });

    const themeFile = loadLessonThemes(lv);
    if (!themeFile) {
      list.forEach((r, i) => {
        r.lessonIndex = Math.floor(i / LESSON_SIZE) + 1;
        r.lessonOrder = (i % LESSON_SIZE) + 1;
        delete r.origIndex;
      });
      lessonTotal += Math.ceil(list.length / LESSON_SIZE);
      continue;
    }

    const themeOf = new Map(
      themeFile.wordThemes.map((w) => [`${w.simplified}|${w.pinyinNumeric}`, w.theme]),
    );
    // Dự phòng khớp theo MỖI CHỮ: file chủ đề soạn tay khoá theo
    // `simplified|pinyinNumeric`, nên mỗi lần sửa cách chọn pinyin (vd bản
    // sửa 2026-09-22 đưa 吗 từ "ma2" về đúng "ma5") là toàn bộ khoá cũ lệch
    // và build gãy. Trong 1 cấp mỗi chữ chỉ thuộc đúng 1 chủ đề nên khớp
    // theo chữ là đủ an toàn, và chủ đề không phụ thuộc cách đọc.
    const themeBySimplified = new Map<string, string>();
    for (const w of themeFile.wordThemes) {
      if (!themeBySimplified.has(w.simplified))
        themeBySimplified.set(w.simplified, w.theme);
    }
    const byTheme = new Map<string, Record<string, unknown>[]>();
    for (const r of list) {
      const key = `${r.simplified as string}|${r.pinyinNumeric as string}`;
      const theme =
        themeOf.get(key) ?? themeBySimplified.get(r.simplified as string);
      if (!theme) {
        // Báo lỗi chứ KHÔNG âm thầm bỏ từ: mỗi lần sửa cách chọn pinyin có
        // thể làm lộ ra cách đọc thứ hai vốn bị gộp mất (vd 只 zhǐ ở HSK3),
        // và những từ đó phải được gán chủ đề tay chứ không nên biến mất.
        throw new Error(
          `Từ "${r.simplified as string}" (${key}) chưa có trong lesson-themes-hsk${lv}.json`,
        );
      }
      if (!byTheme.has(theme)) byTheme.set(theme, []);
      byTheme.get(theme)!.push(r);
    }
    let idx = 0;
    for (const theme of themeFile.themeOrder) {
      const words = byTheme.get(theme) ?? [];
      const parts = Math.max(1, Math.ceil(words.length / MAX_THEME_LESSON));
      const per = Math.ceil(words.length / parts);
      for (let p = 0; p < parts; p += 1) {
        idx += 1;
        const chunk = words.slice(p * per, (p + 1) * per);
        const title =
          parts > 1
            ? `${themeFile.themeNames[theme]} (${p + 1}/${parts})`
            : themeFile.themeNames[theme];
        chunk.forEach((r, i) => {
          r.lessonIndex = idx;
          r.lessonOrder = i + 1;
          r.lessonTitle = title;
          delete r.origIndex;
        });
      }
    }
    lessonTotal += idx;
  }

  writeFileSync(join(OUT, 'words.seed.json'), JSON.stringify(records, null, 1));

  const byLevel = new Map<number, number>();
  for (const r of records) {
    const lv = r.hskLevel as number;
    byLevel.set(lv, (byLevel.get(lv) ?? 0) + 1);
  }
  const report = [
    '# Báo cáo build words.seed.json',
    '',
    `- Tổng số từ: ${records.length}`,
    `- Có nghĩa tiếng Việt: ${withVi} (${((withVi / records.length) * 100).toFixed(1)}%)`,
    `- Thiếu nghĩa tiếng Việt: ${missingVi}`,
    `- Có audio phát âm: ${withAudio}`,
    `- Có âm Hán Việt: ${hanVietCount} (${((hanVietCount / records.length) * 100).toFixed(1)}%)`,
    '',
    '## Số từ theo cấp (7 = gộp 7-9)',
    ...[...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([lv, n]) => `- HSK ${lv}: ${n}`),
    '',
    '## Giấy phép',
    '- words.seed.json: CC BY-SA 4.0 (phái sinh krmanik/HSK-3.0 + CVDICT). Xem data/NOTICES.md.',
  ].join('\n');
  writeFileSync(join(OUT, 'build-report.md'), report);
  console.log(report);
}

main();
