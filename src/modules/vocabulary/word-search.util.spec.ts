import {
  prepareQuery,
  rankWords,
  toSearchRow,
  type SearchRow,
} from './word-search.util';

function row(
  simplified: string,
  pinyinNumeric: string,
  hanViet: string | null,
  meaningVi: string,
  meaningEn: string,
  hskLevel = 1,
  frequencyRank = 100,
): SearchRow {
  return toSearchRow({
    id: simplified,
    simplified,
    traditional: null,
    hskLevel,
    frequencyRank,
    pinyinNumeric,
    hanViet,
    meaningVi,
    meaningEn,
  });
}

const ROWS = [
  row(
    '巧克力',
    'qiao3 ke4 li4',
    'xảo khắc lực',
    'sô-cô-la',
    'chocolate',
    4,
    50,
  ),
  row('学', 'xue2', 'học', 'học', 'learn, study', 1, 30),
  row('学生', 'xue2 sheng5', 'học sinh', 'học sinh', 'student', 1, 40),
  row('学校', 'xue2 xiao4', 'học hiệu', 'trường học', 'school', 1, 60),
  row(
    '电视',
    'dian4 shi4',
    'điện thị',
    'tivi, truyền hình',
    'television',
    1,
    70,
  ),
  row(
    '时间',
    'shi2 jian1',
    'thời gian',
    '(khái niệm) thời gian',
    'time',
    1,
    20,
  ),
  row('时候', 'shi2 hou5', 'thời hậu', 'thời gian; lúc', 'time; when', 1, 15),
  row('吃', 'chi1', 'ngật', 'ăn', 'eat', 1, 25),
  row('饭', 'fan4', 'phạn', 'cơm đã nấu', 'cooked rice', 1, 35),
  row('上', 'shang4', 'thượng', 'trên; (thời gian) trước', 'up, on', 1, 5),
  row('绿', 'lü4', 'lục', 'xanh lá', 'green', 2, 90),
  row('路', 'lu4', 'lộ', 'đường', 'road', 2, 80),
  row('你好', 'ni3 hao3', 'nễ hảo', 'xin chào', 'hello', 1, 10),
  row('新潮', 'xin1 chao2', 'tân triều', 'thời thượng', 'trendy', 7, 900),
  row('空洞', 'kong1 dong4', 'không động', 'hốc; lỗ hổng', 'cavity', 6, 3000),
];
const top = (q: string, n = 3) =>
  rankWords(ROWS, prepareQuery(q))
    .slice(0, n)
    .map((r) => r.simplified);

describe('rankWords — tra từ có xếp hạng', () => {
  it('gõ không dấu "hoc": âm Hán Việt trùng lên đầu, không phải "chocolate"', () => {
    expect(top('hoc')).toEqual(['学', '学生', '学校']);
    expect(top('hoc', 10)).toContain('巧克力'); // vẫn có, nhưng ở cuối (khớp tiếng Anh)
    expect(top('hoc', 10).at(-1)).toBe('巧克力');
  });

  it('pinyin viết liền không dấu / có dấu thanh', () => {
    expect(top('dianshi', 1)).toEqual(['电视']);
    expect(top('diànshì', 1)).toEqual(['电视']);
    expect(top('dian shi', 1)).toEqual(['电视']);
  });

  it('trùng cả Hán Việt lẫn nghĩa (bỏ chú thích ngoặc) đứng trước chỉ trùng nghĩa', () => {
    expect(top('thoi gian', 3)).toEqual(['时间', '时候', '上']);
    expect(top('thời gian', 2)).toEqual(['时间', '时候']);
  });

  it('cụm không trùng mục nào: ra từng phần thay vì trống', () => {
    expect(top('ăn cơm', 2)).toEqual(['吃', '饭']);
    expect(top('an com', 2)).toEqual(['吃', '饭']);
  });

  it('Hán tự: trùng mặt chữ trước, rồi bắt đầu bằng, rồi chứa', () => {
    expect(top('学')).toEqual(['学', '学生', '学校']);
  });

  it('ü gõ bằng v (như bộ gõ) ra đúng chữ; gõ u vẫn ra nhưng sau chữ đọc "u" thật', () => {
    expect(top('lv', 1)).toEqual(['绿']);
    expect(top('lu', 2)).toEqual(['路', '绿']);
  });

  it('nghĩa tiếng Việt nguyên văn cùng bậc với pinyin trùng — cấp thấp lên trước', () => {
    expect(top('xin chao', 2)).toEqual(['你好', '新潮']);
  });

  it('gõ có dấu thì so cả dấu: "học" không ra 空洞 (hốc), "hốc" ra 空洞', () => {
    expect(top('học', 1)).toEqual(['学']);
    expect(top('học', 20)).not.toContain('空洞');
    expect(top('hốc', 1)).toEqual(['空洞']);
  });

  it('1 âm tiết không dấu: nghĩa nguyên văn "hốc" không vượt Hán Việt "học hiệu"', () => {
    const r = top('hoc', 20);
    expect(r.indexOf('学校')).toBeLessThan(r.indexOf('空洞'));
  });

  it('lọc theo cấp', () => {
    expect(
      rankWords(ROWS, prepareQuery('hoc'), 4).map((r) => r.simplified),
    ).toEqual(['巧克力']);
  });
});
