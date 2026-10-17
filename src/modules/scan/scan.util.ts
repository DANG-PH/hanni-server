import { Type } from '@google/genai';

/** Lượt quét mỗi "ngày học" (timezone user + STREAK_DAY_CUTOFF_HOUR): bản
 * thường đủ dùng lúc cần (1 thực đơn, 1 biển hiệu), Premium quét thoải mái —
 * trần 100 chỉ để chặn lạm dụng. Đây là tiện ích AI, không khoá nội dung học. */
export const FREE_SCAN_DAILY_LIMIT = 3;
export const PREMIUM_SCAN_DAILY_LIMIT = 100;
/** Client đã thu ảnh về ≤1600px JPEG (~300KB); trần này cho ảnh gửi thẳng. */
export const SCAN_MAX_BYTES = 6 * 1024 * 1024;
export const SCAN_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
/** Trang sách dày chữ vẫn đủ; chặn để kết quả không dài vô hạn. */
const MAX_LINES = 40;
const MAX_OBJECTS = 8;

/** Một lần gọi Gemini trả cả 2 thứ: chữ Hán đọc được (thực đơn, biển hiệu,
 * sách...) và — khi ảnh CHỦ YẾU chụp món ăn, đồ vật — tên tiếng Trung của
 * từng thứ, như app đếm calo chụp bữa ăn nhưng ra từ vựng để học. Bản đầu bắt
 * chọn 1 trong 2 ("có chữ thì bỏ đồ vật"): ảnh mâm cơm có vài chữ trên lon
 * nước là mất hết món ăn — nên giờ trả cả hai. Thử thật 2026-10-17: thực đơn
 * nghiêng, mờ (cả phồn thể) đọc đúng mọi dòng; mâm cơm ra 米饭, 油条, 筷子,
 * 青菜... Câu dịch máy vẫn có lúc sai (饺子 ra "bánh bao") nên nghĩa từng từ
 * lấy từ từ điển Hanni, không lấy từ câu dịch. */
export const SCAN_PROMPT = `Bạn là công cụ quét ảnh cho người Việt học tiếng Trung.
- "lines": MỌI dòng chữ Hán đọc được trong ảnh, theo thứ tự đọc tự nhiên (trên xuống dưới, trái sang phải; chữ viết dọc thì đọc cột từ phải sang). Mỗi dòng: "zh" = đúng chữ trong ảnh (giữ số, dấu câu; phồn thể giữ phồn thể); "vi" = bản dịch tiếng Việt tự nhiên, ngắn gọn. Không có chữ Hán thì [].
- "objects": nếu ảnh CHỦ YẾU chụp món ăn, đồ vật, con vật, cảnh vật (không có chữ, hoặc chữ chỉ là phụ như nhãn lon, logo): tối đa ${MAX_OBJECTS} thứ nổi bật nhất, thứ quan trọng nhất trước. Mỗi thứ: "zh" = tên gọi tiếng Trung giản thể thông dụng nhất (danh từ ngắn gọn, không kèm số lượng); "vi" = tên tiếng Việt. Nếu ảnh chủ yếu là chữ (thực đơn, biển hiệu, trang sách, màn hình, bao bì nhìn thẳng) thì [].
"kind" = loại ảnh, một trong: "thực đơn", "biển hiệu", "sách, tài liệu", "bao bì", "màn hình, tin nhắn", "chữ viết tay", "món ăn, đồ vật", "khác".
Không thêm pinyin, không giải thích.`;

const LINE_SCHEMA = {
  type: Type.OBJECT,
  properties: { zh: { type: Type.STRING }, vi: { type: Type.STRING } },
  required: ['zh', 'vi'],
};
export const SCAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    kind: { type: Type.STRING },
    lines: { type: Type.ARRAY, items: LINE_SCHEMA },
    objects: { type: Type.ARRAY, items: LINE_SCHEMA },
  },
  required: ['kind', 'lines', 'objects'],
};

export interface ScanLine {
  zh: string;
  vi: string;
}

export interface ScanJson {
  kind: string;
  lines: ScanLine[];
  objects: ScanLine[];
}

const HAN = /\p{Script=Han}/u;

/** Đọc JSON Gemini trả về. Schema đã ép khuôn nhưng vẫn kiểm từng trường —
 * dữ liệu từ ngoài vào; dòng không có chữ Hán nào thì bỏ. `null` = không đọc
 * được (coi như lỗi, hoàn lượt quét). */
export function parseScanJson(text: string): ScanJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const list = (v: unknown, max: number): ScanLine[] =>
    (Array.isArray(v) ? v : [])
      .flatMap((x: unknown) => {
        if (!x || typeof x !== 'object') return [];
        const { zh, vi } = x as Record<string, unknown>;
        if (typeof zh !== 'string' || !HAN.test(zh)) return [];
        return [{ zh: zh.trim(), vi: typeof vi === 'string' ? vi.trim() : '' }];
      })
      .slice(0, max);
  return {
    kind: typeof o.kind === 'string' && o.kind.trim() ? o.kind.trim() : 'khác',
    lines: list(o.lines, MAX_LINES),
    objects: list(o.objects, MAX_OBJECTS),
  };
}

export const hasHan = (s: string) => HAN.test(s);
