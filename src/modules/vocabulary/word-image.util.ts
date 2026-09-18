/**
 * Ảnh minh hoạ cho từ vựng — lấy DẦN qua Wikimedia Commons (MIỄN PHÍ HOÀN
 * TOÀN, KHÔNG cần đăng ký API key gì cả — khác Pexels/Unsplash đều bắt buộc
 * key) khi từ đó lần đầu được xem, cache lại vào `Word.imageUrl` để không
 * gọi lại. CHỈ áp dụng cho danh từ cụ thể (pos có NOUN) — hư từ/động từ trừu
 * tượng (的/了/希望...) không có gì để minh hoạ.
 *
 * Commons chỉ lưu media đã cấp phép tự do (CC0/CC-BY/CC-BY-SA/PD) nên ảnh
 * trả về LUÔN hợp lệ về mặt bản quyền để dùng — không cần kiểm tra license
 * riêng cho từng ảnh như khi tự cào ảnh từ nguồn khác.
 *
 * KHÔNG có dataset ảnh mở nào sẵn có cho từ vựng HSK (đã research) nên đây là
 * cách khả thi duy nhất — không cào hết 10.912 từ trong 1 lần (tôn trọng hạ
 * tầng dùng chung của Wikimedia), chỉ tích luỹ dần theo từ nào thật sự được
 * user xem.
 */

const USER_AGENT = 'Hanni-App/1.0 (https://hanni.dangpham.id.vn)';

/** Rút gọn nghĩa tiếng Anh thành 1 cụm từ khoá tìm ảnh — vd "det.: eight" ->
 * "eight", "dog (LT:隻|只[zhi1])" -> "dog". Bỏ cụm trong ngoặc TRƯỚC khi xét
 * dấu ":" — cụm chú thích kiểu "(LT:...)" cũng có ":" bên trong, xét theo
 * thứ tự ngược lại sẽ cắt nhầm vào giữa chú thích thay vì bỏ hẳn nó đi. */
export function imageQueryFrom(meaningEn: string): string | null {
  let s = meaningEn.replace(/\([^)]*\)/g, '');
  const colonIdx = s.indexOf(':');
  // ":" xuất hiện sớm (vd "det.:", "particle:") -> tiền tố loại từ, bỏ đi;
  // xa hơn thì coi là 1 phần của định nghĩa, giữ nguyên.
  if (colonIdx >= 0 && colonIdx <= 12) s = s.slice(colonIdx + 1);
  const phrase = s.split(/[/,;]/)[0].trim();
  return phrase.length >= 2 ? phrase : null;
}

interface CommonsSearchResult {
  query?: {
    pages?: Record<string, { imageinfo?: { thumburl?: string }[] }>;
  };
}

/** Trả về URL ảnh thu nhỏ (400px) hoặc null nếu không tìm được/lỗi. */
export async function searchCommonsImage(
  query: string,
): Promise<string | null> {
  try {
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
      `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1` +
      '&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json';
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CommonsSearchResult;
    const pages = data.query?.pages ?? {};
    const first = Object.values(pages)[0];
    return first?.imageinfo?.[0]?.thumburl ?? null;
  } catch {
    return null;
  }
}
