/**
 * Tìm điểm ngữ pháp liên quan tới 1 bài học, dựa trên từ khoá Hán tự của điểm
 * ngữ pháp (thường là hư từ: 的/了/吗/把...) có xuất hiện làm TỪ VỰNG THẬT (khớp
 * chính xác, không phải khớp chuỗi con) trong danh sách từ của bài hay không.
 * Khớp chuỗi con sẽ dính rất nhiều trường hợp sai (ví dụ "了" là 1 phần của vô số
 * từ ghép khác không liên quan) — khớp chính xác theo từng từ tránh được việc đó.
 */

/** Ngoặc full-width -> half-width + bỏ khoảng trắng, để so khớp ổn định. */
function normalizeZh(s: string): string {
  return s.replace(/（/g, '(').replace(/）/g, ')').replace(/\s+/g, '');
}

/**
 * Từ khoá tay cho 40 điểm HSK1-3 (prisma/seed/grammar.ts) — titleZh của các điểm
 * này phần lớn chỉ có 1 hư từ nên tách tự động dễ sai, chỉ định thẳng cho chắc.
 */
const MANUAL_TOKENS: Record<string, string[]> = {
  shi: ['是'],
  'de-possessive': ['的'],
  'bu-negation': ['不'],
  'meiyou-negation': ['没(有)', '没'],
  'ma-question': ['吗'],
  'ne-question': ['呢'],
  'zai-location': ['在'],
  'you-existence': ['有'],
  'xiang-yao-want': ['想', '要'],
  'tai-le': ['太', '了'],
  'ji-duoshao': ['几', '多少'],
  'he-and': ['和'],
  'le-completion': ['了'],
  'guo-experience': ['过'],
  'zhengzai-progressive': ['在', '正在'],
  'hui-neng-keyi': ['会', '能', '可以'],
  'bi-comparison': ['比'],
  'yi-jiu': ['一', '就'],
  'yinwei-suoyi': ['因为', '所以'],
  'suiran-danshi': ['虽然', '但是'],
  'de-degree': ['得'],
  'jiu-cai': ['就', '才'],
  'ba-basic': ['把'],
  'rang-jiao': ['让', '叫'],
  'shi-de': ['是', '的'],
  'cong-dao': ['从', '到'],
  'you-you': ['又'],
  yidianr: ['一点儿', '有点儿'],
  'bei-passive': ['被'],
  'yibian-yibian': ['一边'],
  yuelaiyue: ['越来越'],
  'yue-yue': ['越'],
  'budan-erqie': ['不但', '而且'],
  'ruguo-jiu': ['如果', '就'],
  weile: ['为了'],
  'zhe-state': ['着'],
  'directional-complement': ['上', '下', '进', '出', '回', '过'],
  'resultative-complement': ['完', '好', '到', '见', '懂', '错'],
  'zhiyao-zhiyou': ['只要', '只有', '才'],
  chadianr: ['差点儿'],
};

/** HSK4-9: tách titleZh tự động theo dấu phân cách thường gặp trong đại cương. */
function autoTokens(titleZh: string): string[] {
  return normalizeZh(titleZh)
    .split(/[…]{2,}|\.{3,}|\+|\//)
    .map((t) => t.replace(/[()]/g, ''))
    .filter((t) => t.length > 0);
}

export interface MatchableGrammarPoint {
  slug: string;
  titleZh: string;
  titleVi: string;
  summaryVi: string;
  hskLevel: number;
}

/** Điểm ngữ pháp nào trong `points` có từ khoá trùng chính xác 1 từ trong `wordsSimplified`. */
export function relatedGrammarForWords<T extends MatchableGrammarPoint>(
  points: T[],
  wordsSimplified: string[],
): T[] {
  const wordSet = new Set(wordsSimplified.map(normalizeZh));
  return points.filter((point) => {
    const tokens = MANUAL_TOKENS[point.slug] ?? autoTokens(point.titleZh);
    return tokens.some((token) => wordSet.has(normalizeZh(token)));
  });
}
