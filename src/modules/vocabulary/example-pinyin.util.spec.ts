import { examplePinyin, pinyinOverrides } from './example-pinyin.util';

const OVERRIDES = pinyinOverrides([
  { simplified: '裤子', pinyin: 'kù zi' },
  { simplified: '谢谢', pinyin: 'xiè xie' },
  { simplified: '哪儿', pinyin: 'nǎ r' },
  { simplified: '有点儿', pinyin: 'yǒu diǎn r' },
  // chữ có 2 mục (đa âm) không vào bảng đọc — để luật/ngữ cảnh quyết định
  { simplified: '得', pinyin: 'de' },
  { simplified: '得', pinyin: 'dé' },
]);

describe('examplePinyin — pinyin câu ví dụ', () => {
  it('đọc theo từ điển Hanni chứ không theo pinyin-pro thuần', () => {
    expect(examplePinyin('这条裤子有点儿长。', OVERRIDES)).toBe(
      'zhè tiáo kù zi yǒu diǎnr cháng.',
    );
    expect(examplePinyin('请问，洗手间在哪儿？', OVERRIDES)).toBe(
      'qǐng wèn, xǐ shǒu jiān zài nǎr?',
    );
  });

  it('得 sau động từ là "de"; dấu câu và ngoặc kép gọn gàng', () => {
    expect(examplePinyin('他说汉语说得很好。', OVERRIDES)).toBe(
      'tā shuō hàn yǔ shuō de hěn hǎo.',
    );
    expect(examplePinyin('他笑着说：“谢谢！”', OVERRIDES)).toBe(
      'tā xiào zhe shuō: “xiè xie!”',
    );
  });
});
