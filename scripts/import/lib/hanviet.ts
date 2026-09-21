/**
 * Âm Hán Việt — điểm khác biệt đặc thù nhất của Hanni so với MỌI app học
 * tiếng Trung quốc tế (Duolingo, HelloChinese, Du Chinese, ChineseSkill...):
 * họ không nhắm tới người Việt nên không bao giờ khai thác cầu nối Hán
 * Việt — hơn 60-70% từ vựng tiếng Việt vay mượn từ tiếng Hán và giữ lại âm
 * đọc Hán Việt (vd 學生=xué shēng đọc Hán Việt là "học sinh" — TRÙNG khớp
 * nghĩa tiếng Việt hiện đại). Đây là công cụ ghi nhớ mạnh nhất có thể có
 * cho người Việt học tiếng Trung mà không app quốc tế nào tận dụng được.
 *
 * Nguồn: Unihan Database (Unicode Consortium, field `kVietnamese`, giấy
 * phép Unicode License V3 — miễn phí kể cả dùng thương mại, xem
 * data/NOTICES.md). ƯU TIÊN tra theo ký tự PHỒN THỂ (traditional) — verify
 * bằng cách chạy thử thật: `kVietnamese` của Unihan chính xác hơn NHIỀU khi
 * tra theo phồn thể (vd 學=học, 國=quốc, 語=ngữ đều đúng) so với giản thể bị
 * hợp nhất chung ký hiệu (vd 你/好 cho ra âm hiếm gặp "nể"/"háo" thay vì âm
 * phổ biến) — điều này khớp với việc Hán Việt vốn hình thành từ thời chữ
 * Hán còn viết phồn thể.
 *
 * Unihan CÒN THIẾU kVietnamese cho khá nhiều chữ RẤT thông dụng (vd 面 điện
 * 電 說 問 — verify bằng cách chạy thử trên chính bộ 10.9k từ Hanni, phủ được
 * 71.2% từ nếu chỉ dùng Unihan thuần) — bù thêm bằng
 * `data/curated/hanviet-supplement.json` (~150 chữ phổ biến nhất bị thiếu,
 * soạn tay). Từ nào có ký tự KHÔNG tra được âm (dù đã bù) thì để `null` —
 * thà thiếu còn hơn hiện âm sai, không đoán mò cho đủ.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseUnihanVietnamese(
  unihanReadingsPath: string,
): Map<string, string> {
  const map = new Map<string, string>();
  const content = readFileSync(unihanReadingsPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = /^U\+([0-9A-Fa-f]+)\tkVietnamese\t(.+)$/.exec(line);
    if (!m) continue;
    const char = String.fromCodePoint(parseInt(m[1], 16));
    // Có thể liệt kê vài âm đọc, lấy âm ĐẦU TIÊN (âm chính theo Unihan).
    map.set(char, m[2].trim().split(/\s+/)[0]);
  }
  return map;
}

function loadJsonMap(path: string): Map<string, string> {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
  return new Map(Object.entries(raw));
}

/** Bù chỗ Unihan CHƯA CÓ (không ghi đè nguồn gốc). */
export function loadHanVietSupplement(curatedDir: string): Map<string, string> {
  return loadJsonMap(join(curatedDir, 'hanviet-supplement.json'));
}

/** GHI ĐÈ dù Unihan đã có sẵn — cho 2 tình huống phát hiện qua kiểm chứng
 * thật: (1) field `kVietnamese` của Unihan liệt kê NHIỀU âm đọc cách nhau
 * bằng khoảng trắng, KHÔNG theo thứ tự phổ biến (có lúc âm đúng đứng đầu,
 * có lúc đứng giữa/cuối — vd 校 (trường học) Unihan ghi "chò giâu hiệu",
 * lấy âm đầu ra "chò" hoàn toàn sai, âm đúng "hiệu" lại đứng cuối); (2)
 * field chỉ có 1 âm nhưng là âm hiếm/khác biệt rõ với âm phổ biến người
 * Việt nhận ra ngay (vd 好 Unihan ghi "háo", âm phổ biến là "hảo" như
 * "hảo hạng"). Chỉ liệt kê ký tự tần suất cao ĐÃ KIỂM CHỨNG THỦ CÔNG trên
 * chính bộ từ Hanni (xem báo cáo build) — không có tham vọng sửa hết toàn
 * bộ Unihan, chỉ sửa những chỗ ảnh hưởng nhiều từ nhất. */
export function loadHanVietOverrides(curatedDir: string): Map<string, string> {
  return loadJsonMap(join(curatedDir, 'hanviet-overrides.json'));
}

/** Ghép âm Hán Việt cho 1 từ — trả `null` nếu THIẾU âm cho BẤT KỲ ký tự nào
 * (không hiện nửa vời gây hiểu lầm). Ưu tiên tra theo `traditional` (chính
 * xác hơn), rơi về `simplified` nếu từ không có dạng phồn thể riêng. */
export function hanVietOf(
  simplified: string,
  traditional: string | null,
  map: Map<string, string>,
): string | null {
  const chars = Array.from(traditional || simplified);
  const readings = chars.map((c) => map.get(c));
  if (readings.some((r) => !r)) return null;
  return readings.join(' ');
}
