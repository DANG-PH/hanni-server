import { BadRequestException } from '@nestjs/common';

/** Rút youtubeId từ nhiều dạng URL (watch, youtu.be, shorts, embed) hoặc chính id. */
export function parseYoutubeId(input: string): string {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = p.exec(s);
    if (m) return m[1];
  }
  throw new BadRequestException('Link YouTube không hợp lệ');
}

export interface Oembed {
  title?: string;
  author?: string;
  thumbnailUrl?: string;
}

/** Lấy tiêu đề / kênh / thumbnail qua oEmbed (không cần API key). Lỗi thì trả rỗng. */
export async function fetchOembed(youtubeId: string): Promise<Oembed> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${youtubeId}`,
    )}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const d = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: d.title,
      author: d.author_name,
      thumbnailUrl:
        d.thumbnail_url ??
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  } catch {
    return {
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }
}
