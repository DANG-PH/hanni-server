/**
 * Gán câu ví dụ cho từ vựng LẤY TỪ PHỤ ĐỀ VIDEO THẬT.
 *
 * Lý do: chỉ 300/10.912 từ có câu ví dụ (soạn tay, mới xong HSK1), trong khi
 * đã có sẵn **61.453 dòng phụ đề video đều có pinyin + dịch tiếng Việt** nằm
 * không. Trang từ điển thiếu ví dụ thì mỏng — vừa khó lên hạng Google vừa ít
 * giá trị cho người học.
 *
 * Ví dụ từ video hơn hẳn câu soạn sẵn ở một điểm: người học NGHE ĐƯỢC giọng
 * thật trong ngữ cảnh thật, và bấm được về đúng giây đó trong video. Đây là
 * thứ các từ điển Trung-Việt khác không có.
 *
 * Chất lượng: lọc khá chặt vì phụ đề phim có nhiều câu vụn/quá dài và bản
 * dịch là DỊCH MÁY (xem `videos/translate.util.ts`) — chỉ nhận câu trong
 * khoảng độ dài hợp lý, có dịch tiếng Việt đủ dài, và không lấy quá
 * MAX_PER_WORD ví dụ cho một từ.
 *
 * Idempotent: chỉ thêm cho từ CHƯA đủ ví dụ, và bỏ qua câu đã có
 * (`source` ghi rõ `video:<videoId>#<lineIndex>`).
 *
 * Chạy: npx -y tsx@4 scripts/seed-examples-from-videos.ts [--limit=2000]
 */
import { PrismaClient } from '@prisma/client';
import {
  buildWordIndex,
  segmentLine,
} from '../src/modules/videos/word-match.util';

/** Câu quá ngắn thì không thành ví dụ, quá dài thì rối cho người mới. */
const MIN_ZH = 4;
const MAX_ZH = 24;
const MIN_VI = 6;
/** Mỗi từ tối đa bấy nhiêu ví dụ lấy từ video — để còn chỗ cho câu soạn tay
 * (orderIndex nhỏ hơn) và tránh 1 từ phổ biến ngốn hàng trăm dòng. */
const MAX_PER_WORD = 2;

function argOf(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

async function main() {
  const prisma = new PrismaClient();
  const limit = Number(argOf('limit')) || undefined;

  const words = await prisma.word.findMany({
    where: { meaningVi: { not: null } },
    select: {
      id: true,
      simplified: true,
      pinyin: true,
      meaningVi: true,
      hskLevel: true,
      imageUrl: true,
    },
    orderBy: { frequencyRank: 'asc' },
  });
  const index = buildWordIndex(words);
  console.log(`Bảng từ: ${index.size} mục`);

  // Số ví dụ HIỆN CÓ của mỗi từ, để không vượt trần và ưu tiên từ đang trống.
  const existing = await prisma.wordExample.groupBy({
    by: ['wordId'],
    _count: { _all: true },
  });
  const countByWord = new Map(existing.map((e) => [e.wordId, e._count._all]));

  const lines = await prisma.videoLine.findMany({
    where: { vi: { not: null } },
    select: {
      id: true,
      index: true,
      zh: true,
      pinyin: true,
      vi: true,
      startMs: true,
      videoId: true,
    },
    orderBy: { videoId: 'asc' },
    ...(limit ? { take: limit } : {}),
  });
  console.log(`Dòng phụ đề để quét: ${lines.length}`);

  const toCreate: {
    wordId: string;
    zh: string;
    pinyin: string | null;
    vi: string | null;
    orderIndex: number;
    source: string;
  }[] = [];

  for (const line of lines) {
    const zh = line.zh.trim();
    const vi = (line.vi ?? '').trim();
    const zhLen = Array.from(zh).length;
    if (zhLen < MIN_ZH || zhLen > MAX_ZH) continue;
    if (vi.length < MIN_VI) continue;

    for (const token of segmentLine(zh, index)) {
      if (!token.word) continue;
      const wordId = token.word.id;
      const have = countByWord.get(wordId) ?? 0;
      if (have >= MAX_PER_WORD) continue;
      countByWord.set(wordId, have + 1);
      toCreate.push({
        wordId,
        zh,
        pinyin: line.pinyin || null,
        vi,
        // Sau câu soạn tay (orderIndex 0) — ví dụ người viết vẫn ưu tiên hơn.
        orderIndex: 10 + have,
        source: `video:${line.videoId}#${line.index}`,
      });
    }
  }

  console.log(`Sẽ thêm ${toCreate.length} câu ví dụ…`);
  const CHUNK = 1000;
  let added = 0;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const res = await prisma.wordExample.createMany({
      data: toCreate.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    added += res.count;
  }

  const withExamples = await prisma.wordExample
    .groupBy({ by: ['wordId'] })
    .then((r) => r.length);
  console.log(`✓ Thêm ${added} câu. Giờ có ${withExamples} từ có ví dụ.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
