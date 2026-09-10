import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parser cho dữ liệu từ github.com/krmanik/HSK-3.0 (CC BY-SA 4.0), bản 2025-11.
 */

export interface SyllabusRow {
  index: number;
  hskLevel: number; // 1..7 (7 = "7-9")
  hskBandOnly: boolean;
  simplified: string;
  pinyinDiacritic: string; // vd "bàba" (không tách âm tiết)
  posRaw: string; // vd "名", "动、名"
}

/** 新版HSK考试大纲-词汇_cleaned.txt: index \t level \t 简体 \t pinyin \t 词性 */
export function parseSyllabus(dir: string): SyllabusRow[] {
  const raw = readFileSync(join(dir, 'syllabus.tsv'), 'utf8');
  const out: SyllabusRow[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [idx, levelRaw, simplified, pinyin, pos] = line.split('\t');
    if (!simplified) continue;
    // level: "1", "3（7-9）", "7-9" -> lấy phần dẫn đầu
    const lead = /^(7-9|\d+)/.exec((levelRaw ?? '').trim());
    if (!lead) continue;
    const bandOnly = lead[1] === '7-9';
    out.push({
      index: Number(idx) || out.length + 1,
      hskLevel: bandOnly ? 7 : Number(lead[1]),
      hskBandOnly: bandOnly,
      // "本1" / "本2"… là ký hiệu phân biệt nghĩa trong đại cương, không phải chữ Hán
      simplified: simplified.trim().replace(/[0-9]+$/, ''),
      pinyinDiacritic: (pinyin ?? '').trim(),
      posRaw: (pos ?? '').trim(),
    });
  }
  return out;
}

export interface WordTsvRow {
  traditional: string;
  simplified: string;
  pinyinDiacritic: string;
  meaningEn: string;
}

/** tsv/HSK N.tsv: 繁体 \t 简体 \t pinyin \t nghĩa Anh */
export function parseWordTsvs(dir: string): Map<string, WordTsvRow> {
  const map = new Map<string, WordTsvRow>();
  for (const lvl of ['1', '2', '3', '4', '5', '6', '7-9']) {
    let raw: string;
    try {
      raw = readFileSync(join(dir, 'words', `HSK_${lvl}.tsv`), 'utf8');
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [traditional, simplified, pinyin, ...rest] = line.split('\t');
      if (!simplified) continue;
      const key = simplified.trim();
      if (!map.has(key)) {
        map.set(key, {
          traditional: (traditional ?? '').trim(),
          simplified: key,
          pinyinDiacritic: (pinyin ?? '').trim(),
          meaningEn: rest.join(' ').trim(),
        });
      }
    }
  }
  return map;
}

/** with frequency/Final-Merged-N.txt: từ \t số lần xuất hiện (BCC corpus) */
export function parseFrequency(dir: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const lvl of ['1', '2', '3', '4', '5', '6', '7-9']) {
    let raw: string;
    try {
      raw = readFileSync(join(dir, 'freq', `Final-Merged-${lvl}.txt`), 'utf8');
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const [word, count] = line.split('\t');
      if (!word || !count) continue;
      const n = Number(count.trim());
      if (Number.isFinite(n)) map.set(word.trim(), Math.max(map.get(word.trim()) ?? 0, n));
    }
  }
  return map;
}

export interface CedictJsonEntry {
  simplified: string;
  traditional: string;
  pinyin: string[]; // numeric, space-separated
  definitions: Record<string, string>;
}

/** all_cedict.json: { 简体: { simplified, traditional, pinyin:[...], definitions:{key:def} } } */
export function parseAllCedict(dir: string): Map<string, CedictJsonEntry> {
  const raw = readFileSync(join(dir, 'all_cedict.json'), 'utf8');
  const obj = JSON.parse(raw) as Record<string, CedictJsonEntry>;
  return new Map(Object.entries(obj));
}
