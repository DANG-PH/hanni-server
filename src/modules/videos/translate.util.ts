/**
 * Dịch bản chép sang tiếng Việt bằng dịch vụ MIỄN PHÍ, KHÔNG cần API key.
 *
 * Chính: endpoint free của Google Translate (nhanh, chất lượng khá — nhưng
 * hay bị chặn theo IP datacenter). Dự phòng: MyMemory (chậm hơn, có hạn mức
 * ngày; `MYMEMORY_EMAIL` nâng hạn mức).
 *
 * Bảng thuật ngữ tu tiên: mỗi thuật ngữ đổi thành token `qqNzz` trước khi gửi
 * (để máy dịch không đụng vào), khôi phục chữ Hán–Việt chuẩn sau khi dịch.
 * Gộp nhiều câu ngắn vào 1 request (ngăn bằng xuống dòng); nếu số dòng trả về
 * không khớp thì hạ xuống dịch từng câu cho lô đó.
 *
 * Kết quả nên được LƯU lại (DB hoặc file cache) — không gọi lại mỗi lần xem.
 */

/** Thuật ngữ tu tiên: xếp CỤM DÀI trước để thay trước cụm ngắn. */
const GLOSSARY: [string, string][] = [
  ['天玄宗', 'Thiên Huyền Tông'],
  ['血煞堂', 'Huyết Sát Đường'],
  ['血魔门', 'Huyết Ma Môn'],
  ['大圆满', 'đại viên mãn'],
  ['天道毒誓', 'thiên đạo độc thệ'],
  ['御空飞行', 'ngự không phi hành'],
  ['筑基期', 'kỳ Trúc Cơ'],
  ['炼气', 'Luyện Khí'],
  ['筑基', 'Trúc Cơ'],
  ['金丹', 'Kim Đan'],
  ['元婴', 'Nguyên Anh'],
  ['化神', 'Hóa Thần'],
  ['渡劫', 'độ kiếp'],
  ['修为', 'tu vi'],
  ['修炼', 'tu luyện'],
  ['修仙', 'tu tiên'],
  ['修士', 'tu sĩ'],
  ['突破', 'đột phá'],
  ['宗主', 'tông chủ'],
  ['宗门', 'tông môn'],
  ['宿主', 'ký chủ'],
  ['弟子', 'đệ tử'],
  ['长老', 'trưởng lão'],
  ['魔教', 'Ma giáo'],
  ['魔门', 'Ma môn'],
  ['魔修', 'ma tu'],
  ['堂主', 'đường chủ'],
  ['天骄', 'thiên kiêu'],
  ['圣子', 'thánh tử'],
  ['圣地', 'thánh địa'],
  ['法器', 'pháp khí'],
  ['灵石', 'linh thạch'],
  ['灵根', 'linh căn'],
  ['天罚', 'thiên phạt'],
  ['天道', 'thiên đạo'],
  ['穿越', 'xuyên không'],
  ['玄幻', 'huyền huyễn'],
  ['气血', 'khí huyết'],
  ['气息', 'khí tức'],
  ['秘术', 'bí thuật'],
  ['阵法', 'trận pháp'],
  ['卷轴', 'quyển trục'],
  ['宝库', 'kho báu'],
];

const HAN = /\p{Script=Han}/u;
const BATCH = 15;

function encodeTerms(s: string): string {
  let out = s;
  GLOSSARY.forEach(([zh], i) => {
    out = out.split(zh).join(` qq${i}zz `);
  });
  return out;
}

function decodeTerms(s: string): string {
  let out = s;
  GLOSSARY.forEach(([, vi], i) => {
    out = out.replace(new RegExp(`qq\\s*${i}\\s*zz`, 'gi'), vi);
  });
  return out
    .replace(/<\/?[a-z]+[^>]*>/gi, '')
    .replace(/\s+([,.!?;:…])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * MyMemory nâng hạn mức ngày (≈1k → 50k từ) nếu có tham số `de=<email>`.
 * Đặt `MYMEMORY_EMAIL` trong .env cho môi trường thật; mặc định là địa chỉ
 * giả nội bộ (MyMemory không kiểm tra tính hợp lệ, chỉ dùng để tách hạn mức).
 */
const MM_EMAIL = process.env.MYMEMORY_EMAIL || 'video-import@hanni.local';
let googleDead = false; // endpoint free của Google hay bị chặn theo IP máy chủ

/**
 * Bộ dịch CHÍNH: endpoint free của Google (không key). Nhanh + chất lượng hơn
 * MyMemory. Thường chạy trên server thật, nhưng bị chặn ở nhiều IP datacenter —
 * hỏng 1 lần thì tắt hẳn, chuyển sang MyMemory.
 */
async function callGoogle(text: string): Promise<string | null> {
  if (googleDead) return null;
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx' +
    '&sl=zh-CN&tl=vi&dt=t&q=' +
    encodeURIComponent(text);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      googleDead = true;
      return null;
    }
    const data = (await res.json()) as [Array<[string]>, ...unknown[]];
    return (data[0] ?? []).map((seg) => seg[0]).join('');
  } catch {
    googleDead = true;
    return null;
  }
}

/** Bộ dịch DỰ PHÒNG: MyMemory. Ném lỗi khi hết hạn mức ngày. */
async function callMyMemory(text: string): Promise<string | null> {
  const url =
    'https://api.mymemory.translated.net/get?langpair=zh-CN|vi' +
    `&de=${encodeURIComponent(MM_EMAIL)}&q=` +
    encodeURIComponent(text);
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (res.status === 429) throw new Error('MyMemory: hết hạn mức ngày (429)');
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseStatus: number | string;
    responseData?: { translatedText?: string };
    quotaFinished?: boolean;
  };
  const t = data.responseData?.translatedText ?? '';
  if (data.quotaFinished || /USED ALL AVAILABLE FREE TRANSLATIONS/i.test(t)) {
    throw new Error('MyMemory: hết hạn mức ngày');
  }
  if (!t || Number(data.responseStatus) !== 200) return null;
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) return null;
  return t;
}

/** Dịch 1 đoạn text: thử Google trước, rồi MyMemory. */
async function callTranslate(text: string): Promise<string | null> {
  return (await callGoogle(text)) ?? (await callMyMemory(text));
}

/** Dịch 1 câu (đã fallback từ lô hỏng). */
async function translateOne(zh: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await callTranslate(encodeTerms(zh));
    if (raw) return decodeTerms(raw);
    await sleep(500);
  }
  return null;
}

/**
 * Dịch danh sách câu tiếng Trung sang tiếng Việt (máy dịch, gộp lô).
 * - Bỏ qua câu không có chữ Hán (giữ nguyên).
 * - Gộp câu trùng để dịch 1 lần.
 * - `cache` (nếu truyền) được đọc trước + ghi bổ sung.
 * - Khi hết hạn mức: dừng, trả `null` cho phần còn lại.
 */
export async function translateLinesToVi(
  zhLines: string[],
  cache?: Map<string, string>,
): Promise<(string | null)[]> {
  const result = new Map<string, string | null>(cache ?? []);
  const todo = [...new Set(zhLines.filter((s) => HAN.test(s)))].filter(
    (s) => !result.has(s),
  );

  try {
    for (let i = 0; i < todo.length; i += BATCH) {
      const chunk = todo.slice(i, i + BATCH);
      const joined = chunk.map(encodeTerms).join('\n');
      let outs: (string | null)[] = [];

      const raw = await callTranslate(joined);
      const parts = raw ? raw.split(/\r?\n/) : [];
      if (parts.length === chunk.length) {
        outs = parts.map((p) => decodeTerms(p) || null);
      } else {
        // lô lệch dòng → dịch từng câu
        for (const zh of chunk) {
          outs.push(await translateOne(zh));
          await sleep(150);
        }
      }

      chunk.forEach((zh, k) => {
        const vi = outs[k] ?? null;
        result.set(zh, vi);
        if (vi != null && cache) cache.set(zh, vi);
      });
      await sleep(200);
    }
  } catch (err) {
    console.log(`  ⚠ ${(err as Error).message} — dừng dịch máy`);
  }

  return zhLines.map((zh) => (HAN.test(zh) ? (result.get(zh) ?? null) : zh));
}
