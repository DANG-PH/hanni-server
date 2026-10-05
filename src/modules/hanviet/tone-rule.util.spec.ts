import { toneHintsOf, toneRuleOf, vietToneOf } from './tone-rule.util';

describe('tone-rule.util', () => {
  it('nhận đúng thanh tiếng Việt', () => {
    expect(vietToneOf('thiên')).toBe('ngang');
    expect(vietToneOf('trà')).toBe('huyen');
    expect(vietToneOf('ái')).toBe('sac');
    expect(vietToneOf('thủ')).toBe('hoi');
    expect(vietToneOf('mã')).toBe('nga');
    expect(vietToneOf('đại')).toBe('nang');
  });

  it('tách nhánh âm vang và nhập thanh', () => {
    expect(toneRuleOf('thiên')).toBe('ngang'); // 天 tiān
    expect(toneRuleOf('nhân')).toBe('ngang_vang'); // 人 rén
    expect(toneRuleOf('đông')).toBe('ngang'); // đ không phải âm vang
    expect(toneRuleOf('học')).toBe('nhap_nang'); // 学 xué
    expect(toneRuleOf('lục')).toBe('nhap_nang_vang'); // 六 liù
    expect(toneRuleOf('bạch')).toBe('nhap_nang'); // 白 bái
    expect(toneRuleOf('nhất')).toBe('nhap_sac'); // 一 yī — không đoán
    expect(toneRuleOf('mã')).toBe('hoi_nga');
    expect(toneRuleOf('ái')).toBe('sac_nang');
  });

  it('gợi ý từng chữ của từ ghép', () => {
    const hints = toneHintsOf({
      simplified: '学生',
      hanViet: 'học sinh',
      pinyinNumeric: 'xue2 sheng1',
    });
    expect(hints).toEqual([
      expect.objectContaining({
        char: '学',
        tone: 2,
        predicted: 2,
        follows: true,
      }),
      expect.objectContaining({
        char: '生',
        tone: 1,
        predicted: 1,
        follows: true,
      }),
    ]);
  });

  it('ngoại lệ thật và thanh nhẹ', () => {
    const [ting] = toneHintsOf({
      simplified: '听',
      hanViet: 'thính',
      pinyinNumeric: 'ting1',
    })!;
    expect(ting).toMatchObject({ predicted: 4, follows: false });
    const hints = toneHintsOf({
      simplified: '孩子',
      hanViet: 'hài tử',
      pinyinNumeric: 'hai2 zi5',
    })!;
    expect(hints[1]).toMatchObject({ tone: 5, follows: null });
  });

  it('lệch số chữ/âm thì trả null', () => {
    expect(
      toneHintsOf({
        simplified: '一点儿',
        hanViet: 'nhất điểm',
        pinyinNumeric: 'yi1 dian3 r5',
      }),
    ).toBeNull();
    expect(
      toneHintsOf({ simplified: '好', hanViet: null, pinyinNumeric: 'hao3' }),
    ).toBeNull();
  });
});
