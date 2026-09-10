import { normalizePinyinKey } from './pinyin';

/**
 * Parser complete.json của drkameleon/complete-hsk-vocabulary (MIT).
 * Cấu trúc mỗi mục (rút gọn):
 *   {
 *     simplified, radical, frequency, pos: string[],
 *     level: ["new-1"... "new-7", "old-*"],
 *     forms: [{ traditional, transcriptions: { pinyin, numeric, ... }, meanings: [...] }]
 *   }
 */
export interface DrkEntry {
  simplified: string;
  traditional: string | null;
  pinyinNumeric: string;
  pinyinKey: string;
  pos: string[];
  frequencyRank: number | null;
  radical: string | null;
  hskLevel: number | null; // 1..7 (7 = 7-9)
  meaningsEn: string[];
}

interface RawForm {
  traditional?: string;
  transcriptions?: { pinyin?: string; numeric?: string };
  meanings?: string[];
}
interface RawEntry {
  simplified?: string;
  radical?: string;
  frequency?: number;
  pos?: string[];
  level?: string[];
  forms?: RawForm[];
}

function pickNewLevel(levels: string[] | undefined): number | null {
  if (!levels) return null;
  for (const l of levels) {
    const m = /^new-(\d)(?:-\d)?$/.exec(l);
    if (m) return Number(m[1]);
    if (l === 'new-7-9') return 7;
  }
  return null;
}

export function parseDrkameleon(json: unknown): DrkEntry[] {
  const arr = Array.isArray(json) ? (json as RawEntry[]) : [];
  const out: DrkEntry[] = [];
  for (const e of arr) {
    if (!e.simplified) continue;
    const level = pickNewLevel(e.level);
    if (level == null) continue; // chỉ giữ từ HSK 3.0 (new-*)
    const form = e.forms?.[0] ?? {};
    const numeric = form.transcriptions?.numeric ?? form.transcriptions?.pinyin ?? '';
    out.push({
      simplified: e.simplified,
      traditional: form.traditional ?? null,
      pinyinNumeric: numeric,
      pinyinKey: normalizePinyinKey(numeric),
      pos: e.pos ?? [],
      frequencyRank: typeof e.frequency === 'number' ? e.frequency : null,
      radical: e.radical ?? null,
      hskLevel: level,
      meaningsEn: form.meanings ?? [],
    });
  }
  return out;
}
