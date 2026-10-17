import { parseScanJson } from './scan.util';

describe('parseScanJson', () => {
  it('đọc kết quả ảnh có chữ', () => {
    const r = parseScanJson(
      JSON.stringify({
        kind: 'thực đơn',
        lines: [
          { zh: ' 牛肉面 25元 ', vi: 'Mì bò 25 tệ' },
          { zh: '饺子', vi: 'Sủi cảo' },
        ],
        objects: [],
      }),
    );
    expect(r).toEqual({
      kind: 'thực đơn',
      lines: [
        { zh: '牛肉面 25元', vi: 'Mì bò 25 tệ' },
        { zh: '饺子', vi: 'Sủi cảo' },
      ],
      objects: [],
    });
  });

  it('bỏ dòng không có chữ Hán, sai kiểu; thiếu nghĩa thì để trống', () => {
    const r = parseScanJson(
      JSON.stringify({
        kind: '',
        lines: [{ zh: 'MENU 2024', vi: 'x' }, { zh: 42 }, null, { zh: '茶' }],
        objects: 'không phải mảng',
      }),
    );
    expect(r).toEqual({
      kind: 'khác',
      lines: [{ zh: '茶', vi: '' }],
      objects: [],
    });
  });

  it('chặn tối đa 8 đồ vật', () => {
    const objects = Array.from({ length: 12 }, () => ({
      zh: '苹果',
      vi: 'táo',
    }));
    const r = parseScanJson(
      JSON.stringify({ kind: 'món ăn, đồ vật', lines: [], objects }),
    );
    expect(r?.objects).toHaveLength(8);
  });

  it('JSON hỏng thì null (hoàn lượt quét)', () => {
    expect(parseScanJson('{"kind": "thực đơn", "lines": [')).toBeNull();
    expect(parseScanJson('"chuỗi"')).toBeNull();
  });
});
