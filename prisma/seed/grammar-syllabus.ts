import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * Mục ngữ pháp HSK 4–9 lấy TỪ ĐẠI CƯƠNG CHÍNH THỨC (krmanik/HSK-3.0,
 * "New HSK (2025)/HSK Grammar/json"). Đây là danh sách tra cứu theo loại từ /
 * kiểu câu — KHÔNG có giải thích chi tiết (`explanationVi` rỗng, không ví dụ).
 * Các điểm ngữ pháp HSK 1–3 có giải thích do Hanni soạn tay (grammar.ts).
 */

interface RawItem {
  level: number;
  cat: string;
  catName: string;
  sub: string;
  content: string;
}

/** Thuật ngữ ngữ pháp tiếng Trung → tiếng Việt. */
const TERM: Record<string, string> = {
  语素: 'Hình vị',
  前缀: 'Tiền tố',
  后缀: 'Hậu tố',
  词类: 'Từ loại',
  名词: 'Danh từ',
  方位名词: 'Danh từ chỉ phương vị',
  时间名词: 'Danh từ chỉ thời gian',
  动词: 'Động từ',
  能愿动词: 'Động từ năng nguyện',
  离合词: 'Từ ly hợp',
  趋向动词: 'Động từ xu hướng',
  形容词: 'Tính từ',
  代词: 'Đại từ',
  疑问代词: 'Đại từ nghi vấn',
  人称代词: 'Đại từ nhân xưng',
  指示代词: 'Đại từ chỉ định',
  数词: 'Số từ',
  概数: 'Số ước chừng',
  序数: 'Số thứ tự',
  量词: 'Lượng từ',
  名量词: 'Lượng từ chỉ danh',
  动量词: 'Lượng từ chỉ động tác',
  时量词: 'Lượng từ chỉ thời lượng',
  复量词: 'Lượng từ phức',
  副词: 'Phó từ',
  程度副词: 'Phó từ mức độ',
  范围副词: 'Phó từ phạm vi',
  时间副词: 'Phó từ thời gian',
  否定副词: 'Phó từ phủ định',
  语气副词: 'Phó từ ngữ khí',
  频率副词: 'Phó từ tần suất',
  关联副词: 'Phó từ liên kết',
  情态副词: 'Phó từ tình thái',
  介词: 'Giới từ',
  连词: 'Liên từ',
  助词: 'Trợ từ',
  结构助词: 'Trợ từ kết cấu',
  动态助词: 'Trợ từ động thái',
  语气助词: 'Trợ từ ngữ khí',
  比况助词: 'Trợ từ so sánh',
  叹词: 'Thán từ',
  拟声词: 'Từ tượng thanh',
  短语: 'Đoản ngữ (cụm từ)',
  的字短语: 'Đoản ngữ chữ 的',
  介词短语: 'Đoản ngữ giới từ',
  数量短语: 'Đoản ngữ số lượng',
  固定短语: 'Đoản ngữ cố định',
  句子成分: 'Thành phần câu',
  主语: 'Chủ ngữ',
  谓语: 'Vị ngữ',
  宾语: 'Tân ngữ',
  定语: 'Định ngữ',
  状语: 'Trạng ngữ',
  补语: 'Bổ ngữ',
  结果补语: 'Bổ ngữ kết quả',
  程度补语: 'Bổ ngữ mức độ',
  趋向补语: 'Bổ ngữ xu hướng',
  数量补语: 'Bổ ngữ số lượng',
  时量补语: 'Bổ ngữ thời lượng',
  动量补语: 'Bổ ngữ động lượng',
  可能补语: 'Bổ ngữ khả năng',
  情态补语: 'Bổ ngữ tình thái',
  句法: 'Cú pháp',
  句型: 'Kiểu câu',
  句类: 'Loại câu',
  单句: 'Câu đơn',
  复句: 'Câu phức',
  紧缩句: 'Câu rút gọn',
  特殊句式: 'Câu đặc biệt',
  把字句: 'Câu chữ 把',
  被字句: 'Câu chữ 被 (bị động)',
  比字句: 'Câu chữ 比 (so sánh)',
  连动句: 'Câu liên động',
  兼语句: 'Câu kiêm ngữ',
  存现句: 'Câu tồn hiện',
  是字句: 'Câu chữ 是',
  有字句: 'Câu chữ 有',
  疑问句: 'Câu nghi vấn',
  是非问句: 'Câu hỏi có/không',
  特指问句: 'Câu hỏi có từ để hỏi',
  正反问句: 'Câu hỏi chính phản',
  选择问句: 'Câu hỏi lựa chọn',
  陈述句: 'Câu trần thuật',
  感叹句: 'Câu cảm thán',
  祈使句: 'Câu cầu khiến',
  省略句: 'Câu tỉnh lược',
};

const vt = (zh: string) => TERM[zh] ?? zh;

export async function seedGrammarSyllabus(prisma: PrismaClient): Promise<void> {
  let raw: RawItem[];
  try {
    raw = JSON.parse(
      readFileSync(
        join(__dirname, 'data', 'grammar-syllabus.raw.json'),
        'utf8',
      ),
    ) as RawItem[];
  } catch {
    console.log('  ⚠ Chưa có grammar-syllabus.raw.json — bỏ qua ngữ pháp HSK 4–9.');
    return;
  }

  let n = 0;
  const perLevel = new Map<number, number>();
  for (const it of raw) {
    const idx = (perLevel.get(it.level) ?? 0) + 1;
    perLevel.set(it.level, idx);
    const slug = `hsk${it.level}-syl-${idx}`;
    const label = [vt(it.catName), it.sub && vt(it.sub)]
      .filter(Boolean)
      .join(' · ');
    await prisma.grammarPoint.upsert({
      where: { slug },
      create: {
        slug,
        hskLevel: it.level,
        orderIndex: 1000 + idx, // luôn xếp sau các điểm có giải thích
        titleZh: it.content,
        titleVi: label || 'Mục ngữ pháp',
        summaryVi: `${vt(it.cat)} — theo đại cương HSK ${it.level === 7 ? '7–9' : it.level}.`,
        explanationVi: '',
        patterns: [],
        examples: [],
      },
      update: {
        hskLevel: it.level,
        orderIndex: 1000 + idx,
        titleZh: it.content,
        titleVi: label || 'Mục ngữ pháp',
        summaryVi: `${vt(it.cat)} — theo đại cương HSK ${it.level === 7 ? '7–9' : it.level}.`,
      },
    });
    n += 1;
  }
  console.log(`  ✓ ${n} mục ngữ pháp HSK 4–9 (đại cương chính thức)`);
}
