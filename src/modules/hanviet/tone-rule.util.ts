/**
 * Quy luật đoán thanh điệu tiếng Trung từ âm Hán Việt.
 *
 * Cả thanh Hán Việt lẫn thanh tiếng Trung hiện đại đều bắt nguồn từ 4 thanh
 * tiếng Hán trung đại (bình-thượng-khứ-nhập) tách theo phụ âm đầu, nên tương
 * ứng với nhau khá đều. Đo trên chính bộ từ Hanni (2026-09-26, sau khi sửa âm
 * Nôm lẫn trong Unihan): bằng/trắc đúng ~95%, thanh cụ thể đúng ~87% (HSK1-4
 * ~90%). Chữ nhập thanh mang dấu sắc thì tiếng Trung phân tán đều 4 thanh —
 * không đoán được, trả `null` chứ không bịa.
 */

export type VietTone = 'ngang' | 'huyen' | 'sac' | 'hoi' | 'nga' | 'nang';
export type MandarinTone = 1 | 2 | 3 | 4;

export type ToneRuleKey =
  | 'ngang'
  | 'huyen'
  | 'hoi_nga'
  | 'sac_nang'
  | 'ngang_vang'
  | 'nhap_nang'
  | 'nhap_nang_vang'
  | 'nhap_sac';

/** Thứ tự hiển thị: 4 quy luật chính trước, các trường hợp nâng cao sau. */
export const TONE_RULE_KEYS: ToneRuleKey[] = [
  'ngang',
  'huyen',
  'hoi_nga',
  'sac_nang',
  'ngang_vang',
  'nhap_nang',
  'nhap_nang_vang',
  'nhap_sac',
];

export const PREDICTED_TONE: Record<ToneRuleKey, MandarinTone | null> = {
  ngang: 1,
  huyen: 2,
  hoi_nga: 3,
  sac_nang: 4,
  ngang_vang: 2,
  nhap_nang: 2,
  nhap_nang_vang: 4,
  nhap_sac: null,
};

const TONE_MARKS: [string, VietTone][] = [
  ['̀', 'huyen'],
  ['́', 'sac'],
  ['̉', 'hoi'],
  ['̃', 'nga'],
  ['̣', 'nang'],
];

export function vietToneOf(syllable: string): VietTone {
  const decomposed = syllable.normalize('NFD');
  for (const [mark, tone] of TONE_MARKS)
    if (decomposed.includes(mark)) return tone;
  return 'ngang';
}

/** Bỏ mọi dấu (kể cả dấu mũ/móc), giữ nguyên "đ" vì NFD không tách nó. */
function bare(syllable: string): string {
  return syllable.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Nhập thanh: âm tiết khép bằng -p/-t/-c/-ch (học, nhất, thập, bạch). */
export function isEnteringTone(syllable: string): boolean {
  return /(p|t|c|ch)$/.test(bare(syllable));
}

/** Phụ âm đầu "vang" (m, n, nh, ng, l, v, d — không tính đ): nhánh thanh
 * trung đại của chúng rẽ khác nhóm phụ âm còn lại (人 nhân → rén, 六 lục → liù). */
export function hasSonorantInitial(syllable: string): boolean {
  return /^[mnlvd]/.test(bare(syllable));
}

export function toneRuleOf(syllable: string): ToneRuleKey {
  const tone = vietToneOf(syllable);
  const vang = hasSonorantInitial(syllable);
  if (isEnteringTone(syllable)) {
    if (tone === 'nang') return vang ? 'nhap_nang_vang' : 'nhap_nang';
    return 'nhap_sac';
  }
  if (tone === 'ngang') return vang ? 'ngang_vang' : 'ngang';
  if (tone === 'huyen') return 'huyen';
  if (tone === 'hoi' || tone === 'nga') return 'hoi_nga';
  return 'sac_nang';
}

/** Số thanh từ âm tiết pinyin dạng số ("xue2" → 2, "ma5" → 5). */
export function mandarinToneOf(pinyinSyllable: string): number | null {
  const m = /([1-5])$/.exec(pinyinSyllable.trim());
  return m ? Number(m[1]) : null;
}

export interface ToneHint {
  char: string;
  hanViet: string;
  /** Thanh thật theo pinyin — 5 là thanh nhẹ (không áp quy luật). */
  tone: number;
  rule: ToneRuleKey;
  predicted: MandarinTone | null;
  /** `null` khi không đánh giá được (thanh nhẹ hoặc quy luật không đoán). */
  follows: boolean | null;
}

/** Gợi ý quy luật cho từng chữ của 1 từ — chỉ khi số chữ, số âm Hán Việt và
 * số âm tiết pinyin khớp nhau; lệch thì trả `null` thay vì ghép sai chữ. */
export function toneHintsOf(word: {
  simplified: string;
  hanViet: string | null;
  pinyinNumeric: string;
}): ToneHint[] | null {
  if (!word.hanViet) return null;
  const chars = Array.from(word.simplified);
  const readings = word.hanViet.split(/\s+/);
  const syllables = word.pinyinNumeric.trim().split(/\s+/);
  if (chars.length !== readings.length || chars.length !== syllables.length)
    return null;
  const hints: ToneHint[] = [];
  for (let i = 0; i < chars.length; i++) {
    const tone = mandarinToneOf(syllables[i]);
    if (tone == null) return null;
    const rule = toneRuleOf(readings[i]);
    const predicted = PREDICTED_TONE[rule];
    hints.push({
      char: chars[i],
      hanViet: readings[i],
      tone,
      rule,
      predicted,
      follows: tone === 5 || predicted == null ? null : predicted === tone,
    });
  }
  return hints;
}
