import {
  analyzePrompt,
  mnemonicPrompt,
  normalizeText,
  parseAnalysis,
  parseMnemonic,
  parseSentenceCheck,
  type WordFacts,
} from './ai-tools.util';

const DIAN_NAO: WordFacts = {
  simplified: '电脑',
  pinyin: 'diàn nǎo',
  hanViet: 'điện não',
  meaningVi: 'máy tính',
  hskLevel: 1,
  chars: [
    { char: '电', hanViet: 'điện', meaningVi: 'điện; điện lực' },
    { char: '脑', hanViet: 'não', meaningVi: null },
  ],
};

describe('ai-tools.util', () => {
  it('prompt mẹo nhớ đưa đủ âm Hán Việt + nghĩa từng chữ (AI không phải tự đoán)', () => {
    const p = mnemonicPrompt(DIAN_NAO);
    expect(p).toContain('Âm Hán Việt: điện não');
    expect(p).toContain('电 = điện (nghĩa riêng: điện)');
    expect(p).toContain('脑 = não');
  });

  it('mẹo nhớ: bỏ markdown, từ chối câu quá ngắn / JSON hỏng', () => {
    expect(
      parseMnemonic(
        '{"mnemonic":"**Điện não** = bộ não chạy bằng điện → máy tính."}',
      ),
    ).toBe('Điện não = bộ não chạy bằng điện → máy tính.');
    expect(parseMnemonic('{"mnemonic":"ngắn"}')).toBeNull();
    expect(parseMnemonic('không phải json')).toBeNull();
  });

  it('chấm câu: kẹp điểm 0–100, bắt buộc câu sửa có chữ Hán', () => {
    const ok = parseSentenceCheck(
      JSON.stringify({
        score: 140,
        usesWord: true,
        corrected: '我用电脑学习。',
        pinyin: 'wǒ yòng diànnǎo xuéxí',
        translationVi: 'Tôi dùng máy tính để học.',
        explanationVi: 'Câu đúng.',
        tipVi: '',
      }),
    );
    expect(ok?.score).toBe(100);
    expect(ok?.tipVi).toBeNull();
    expect(
      parseSentenceCheck(
        JSON.stringify({
          score: 50,
          usesWord: false,
          corrected: 'abc',
          pinyin: 'a',
          translationVi: 'b',
          explanationVi: 'c',
        }),
      ),
    ).toBeNull();
  });

  it('phân tích câu: tối đa 3 điểm ngữ pháp, bỏ mục thiếu trường', () => {
    const a = parseAnalysis(
      JSON.stringify({
        zh: '我把书放在桌子上',
        pinyin: 'wǒ bǎ shū fàng zài zhuōzi shang',
        translationVi: 'Tôi đặt sách lên bàn.',
        grammar: [
          {
            pattern: '把 + tân ngữ + động từ',
            explanationVi: 'đưa tân ngữ lên trước',
          },
          { pattern: '', explanationVi: 'thiếu cấu trúc' },
          { pattern: 'A', explanationVi: '1' },
          { pattern: 'B', explanationVi: '2' },
          { pattern: 'C', explanationVi: '3' },
        ],
        notesVi: '',
      }),
    );
    expect(a?.grammar.map((g) => g.pattern)).toEqual([
      '把 + tân ngữ + động từ',
      'A',
      'B',
    ]);
    expect(a?.notesVi).toBeNull();
  });

  it('prompt phân tích đổi theo chiều dịch; khoá đệm bỏ dấu câu cuối', () => {
    expect(analyzePrompt('Tôi muốn uống cà phê', 'vi')).toContain(
      'Dịch câu tiếng Việt',
    );
    expect(analyzePrompt('我想喝咖啡', 'zh')).toContain(
      'Phân tích câu tiếng Trung',
    );
    expect(normalizeText('  我想喝咖啡。 ')).toBe('我想喝咖啡');
  });
});
