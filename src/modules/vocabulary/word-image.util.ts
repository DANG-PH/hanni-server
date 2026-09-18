/**
 * Ảnh minh hoạ cho từ vựng — lấy DẦN qua Pexels (miễn phí, dùng thương mại
 * được, không bắt buộc ghi nguồn) khi từ đó lần đầu được xem, cache lại vào
 * `Word.imageUrl` để không gọi lại. CHỈ áp dụng cho danh từ cụ thể (pos có
 * NOUN) — hư từ/động từ trừu tượng (的/了/希望...) không có gì để minh hoạ,
 * gọi API cho chúng chỉ tốn hạn mức (200 lượt/giờ ở gói free) một cách vô ích.
 *
 * KHÔNG có dataset ảnh mở nào sẵn có cho từ vựng HSK (đã research) nên đây là
 * cách khả thi duy nhất — không thể lấy hết 10.912 từ trong 1 lần vì hạn mức
 * Pexels thấp, chỉ tích luỹ dần theo từ nào thật sự được user xem.
 */

/** Rút gọn nghĩa tiếng Anh thành 1 cụm từ khoá tìm ảnh — vd "det.: eight" ->
 * "eight", "a challenge to battle/contest" -> "a challenge to battle". */
export function imageQueryFrom(meaningEn: string): string | null {
  const afterColon = meaningEn.includes(':')
    ? meaningEn.split(':').slice(1).join(':')
    : meaningEn;
  const phrase = afterColon.split(/[/,;(]/)[0].trim();
  return phrase.length >= 2 ? phrase : null;
}

export interface PexelsSearchResult {
  photos?: { src?: { medium?: string } }[];
}

/** Trả về URL ảnh (đã chọn cỡ "medium") hoặc null nếu không tìm được/lỗi. */
export async function searchPexelsImage(
  query: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PexelsSearchResult;
    return data.photos?.[0]?.src?.medium ?? null;
  } catch {
    return null;
  }
}
