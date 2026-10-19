/**
 * Trích bộ thủ + tổng số nét cho từng chữ Hán có trong từ vựng Hanni (giản thể lẫn phồn thể)
 * từ Unihan (`kRSUnicode`, `kTotalStrokes` trong Unihan_IRGSources.txt) → data/curated/char-info.json.
 * Dùng cho khung "Hán tự" ở trang từ điển (Bộ: TỬ 子 · 8 nét) như Hanzii.
 *
 * Unihan.zip tải ở https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip (Unicode License V3,
 * xem data/NOTICES.md) — không commit bản gốc (~40MB), chỉ commit JSON đã trích.
 *
 * Chạy: npx tsx scripts/import/build-char-info.ts <đường dẫn Unihan_IRGSources.txt>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const src = process.argv[2];
if (!src) throw new Error('Thiếu đường dẫn Unihan_IRGSources.txt');

const words = JSON.parse(
  readFileSync(join(root, 'data/processed/words.seed.json'), 'utf8'),
) as { simplified: string; traditional: string | null }[];
const wanted = new Set<string>();
for (const w of words)
  for (const c of `${w.simplified}${w.traditional ?? ''}`)
    if (/\p{Script=Han}/u.test(c)) wanted.add(c);

const rs = new Map<string, string>();
const strokes = new Map<string, number>();
for (const line of readFileSync(src, 'utf8').split('\n')) {
  const m = /^U\+([0-9A-F]+)\t(kRSUnicode|kTotalStrokes)\t(.+)$/.exec(line);
  if (!m) continue;
  const c = String.fromCodePoint(parseInt(m[1], 16));
  if (!wanted.has(c)) continue;
  // Nhiều giá trị cách nhau bởi khoảng trắng: lấy giá trị đầu (chuẩn Trung Quốc đại lục).
  const first = m[3].trim().split(/\s+/)[0];
  if (m[2] === 'kRSUnicode') rs.set(c, first);
  else strokes.set(c, Number(first));
}

// "39.5" → bộ 39, thêm 5 nét; "120'.6" → dạng giản thể của bộ 120 (纟).
const out: Record<string, [string, number | null]> = {};
let missing = 0;
for (const c of [...wanted].sort()) {
  const r = rs.get(c);
  if (!r) {
    missing += 1;
    continue;
  }
  out[c] = [r.split('.')[0], strokes.get(c) ?? null];
}
writeFileSync(
  join(root, 'data/curated/char-info.json'),
  JSON.stringify(out) + '\n',
);
console.log(
  `char-info: ${Object.keys(out).length}/${wanted.size} chữ (thiếu ${missing})`,
);
