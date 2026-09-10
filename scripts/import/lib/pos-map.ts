import { WordPos } from '@prisma/client';

/**
 * Mã từ loại tiếng Trung trong đại cương HSK 3.0 → enum WordPos.
 * Từ ghép ngăn cách bằng "、"; dấu ngoặc "（）" nghĩa là nghĩa phụ, vẫn tính.
 */
const MAP: Record<string, WordPos> = {
  名: WordPos.NOUN,
  动: WordPos.VERB,
  形: WordPos.ADJECTIVE,
  副: WordPos.ADVERB,
  代: WordPos.PRONOUN,
  数: WordPos.NUMERAL,
  量: WordPos.MEASURE,
  数量: WordPos.MEASURE,
  连: WordPos.CONJUNCTION,
  介: WordPos.PREPOSITION,
  助: WordPos.PARTICLE,
  叹: WordPos.INTERJECTION,
  拟声: WordPos.OTHER,
  前缀: WordPos.OTHER,
  后缀: WordPos.OTHER,
  成语: WordPos.IDIOM,
  习语: WordPos.IDIOM,
};

export function mapPos(raw: string | undefined | null): WordPos[] {
  if (!raw) return [];
  const parts = raw
    .replace(/[（）()]/g, '')
    .split(/[、,，/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = new Set<WordPos>();
  for (const p of parts) {
    const m = MAP[p];
    if (m) out.add(m);
  }
  return [...out];
}
