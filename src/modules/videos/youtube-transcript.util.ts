import { YoutubeTranscript } from 'youtube-transcript';

export interface TimedLine {
  zh: string;
  startMs: number;
}

const ZH_LANGS = ['zh-Hans', 'zh', 'zh-CN', 'zh-Hant', 'zh-TW'];
const HAN = /\p{Script=Han}/u;

/**
 * Phụ đề đôi khi xếp chồng 3 dòng (Hán / pinyin / English) trong 1 segment —
 * chọn dòng nhiều chữ Hán nhất, gộp khoảng trắng. Giữ nguyên số và tên latin.
 */
function cleanZh(raw: string): string {
  const lines = raw.split(/\r?\n/).map((s) => s.trim());
  const best =
    lines
      .filter(Boolean)
      .sort(
        (a, b) =>
          (b.match(/\p{Script=Han}/gu)?.length ?? 0) -
          (a.match(/\p{Script=Han}/gu)?.length ?? 0),
      )[0] ?? raw;
  return best.replace(/\s+/g, ' ').trim();
}

/**
 * Lấy bản chép tiếng Trung có mốc thời gian thật từ phụ đề YouTube.
 * Trả [] nếu video không có phụ đề tiếng Trung.
 */
/** Thư viện youtube-transcript không có timeout riêng — có thể treo vô thời hạn
 *  nếu mạng chặn/nghẽn. Ép timeout ở đây để 1 video lỗi không làm treo cả seed. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout sau ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

export async function fetchTimedTranscript(
  youtubeId: string,
): Promise<TimedLine[]> {
  for (const lang of ZH_LANGS) {
    try {
      const segs = await withTimeout(
        YoutubeTranscript.fetchTranscript(youtubeId, { lang }),
        20_000,
      );
      const out: TimedLine[] = [];
      for (const s of segs) {
        if (!HAN.test(s.text)) continue;
        const zh = cleanZh(s.text);
        if ((zh.match(/\p{Script=Han}/gu)?.length ?? 0) < 2) continue;
        out.push({ zh, startMs: Math.round(s.offset) });
      }
      if (out.length >= 3) return out;
    } catch {
      /* thử ngôn ngữ khác */
    }
  }
  return [];
}
