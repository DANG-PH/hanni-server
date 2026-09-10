import { normalizePinyinKey } from './pinyin';

/**
 * Parser TSV do Punpuf/hsk-syllabus-vocabulary-parser sinh ra
 * (parse thẳng đại cương thi HSK 3.0 chính thức bản 2026).
 * Cột: word_index, level, word, pinyin, part_of_speech,
 *      pinyin_numbered, pinyin_cc-cedict, traditional_cc-cedict, definition_cc-cedict
 */
export interface PunpufEntry {
  level: number; // 1..6, hoặc 7 cho "7-9"
  bandOnly: boolean;
  word: string;
  pinyinNumeric: string;
  pinyinKey: string;
  pos: string;
}

export function parsePunpufTsv(content: string): PunpufEntry[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t') ?? [];
  const col = (name: string) => header.indexOf(name);
  const iLevel = col('level');
  const iWord = col('word');
  const iNum = col('pinyin_numbered') >= 0 ? col('pinyin_numbered') : col('pinyin');
  const iPos = col('part_of_speech');

  const out: PunpufEntry[] = [];
  for (const line of lines) {
    const cells = line.split('\t');
    const rawLevel = (cells[iLevel] ?? '').trim();
    const bandOnly = /7-9|7–9/.test(rawLevel);
    const level = bandOnly ? 7 : Number(rawLevel);
    if (!level || Number.isNaN(level)) continue;
    const numeric = cells[iNum] ?? '';
    out.push({
      level,
      bandOnly,
      word: (cells[iWord] ?? '').trim(),
      pinyinNumeric: numeric,
      pinyinKey: normalizePinyinKey(numeric),
      pos: (cells[iPos] ?? '').trim(),
    });
  }
  return out;
}

export function indexPunpuf(entries: PunpufEntry[]): Map<string, PunpufEntry> {
  const map = new Map<string, PunpufEntry>();
  for (const e of entries) {
    map.set(`${e.word}|${e.pinyinKey}`, e);
    if (!map.has(e.word)) map.set(e.word, e);
  }
  return map;
}
