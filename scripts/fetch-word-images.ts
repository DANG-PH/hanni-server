/**
 * Cào ảnh minh hoạ cho từ vựng (Word.imageUrl) qua Wikimedia Commons.
 *
 * Trước đây ảnh CHỈ được lấy khi có người thật mở xem từ đó
 * (`WordsService.attachImage`) — với lượng người dùng hiện tại thì gần như
 * không có gì được lấy (đo 2026-09-22: 51/10.912 từ có ảnh). Script này lấp
 * sẵn để người học đầu tiên đã thấy ảnh ngay, không phải là người "khai
 * hoang" cho những người sau.
 *
 * TÔN TRỌNG HẠ TẦNG DÙNG CHUNG của Wikimedia (đây là lý do trước đó cố tình
 * KHÔNG cào hàng loạt): chạy TUẦN TỰ, mỗi request cách nhau `DELAY_MS`, có
 * User-Agent mô tả rõ ứng dụng đúng policy của họ. KHÔNG chạy song song.
 *
 * Chỉ lấy cho danh từ cụ thể (`pos` có NOUN) — hư từ/động từ trừu tượng
 * không có gì để minh hoạ. Idempotent: bỏ qua từ đã có `imageUrl`.
 *
 * Chạy:  npx tsx scripts/fetch-word-images.ts [--level=1,2,3] [--limit=500]
 */
import { PrismaClient, WordPos } from '@prisma/client';
import {
  imageQueryFrom,
  searchCommonsImage,
} from '../src/modules/vocabulary/word-image.util';

const DELAY_MS = 400;

function argOf(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const prisma = new PrismaClient();
  const levels = argOf('level')
    ?.split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => n >= 1 && n <= 9);
  const limit = Number(argOf('limit')) || undefined;

  const words = await prisma.word.findMany({
    where: {
      imageUrl: null,
      meaningEn: { not: null },
      pos: { has: WordPos.NOUN },
      ...(levels?.length ? { hskLevel: { in: levels } } : {}),
    },
    select: { id: true, simplified: true, meaningEn: true, hskLevel: true },
    // từ thông dụng trước: nếu dừng giữa chừng thì phần đã lấy vẫn là phần
    // người học hay gặp nhất
    orderBy: [{ hskLevel: 'asc' }, { frequencyRank: 'asc' }],
    ...(limit ? { take: limit } : {}),
  });

  console.log(
    `${words.length} từ cần lấy ảnh${levels?.length ? ` (HSK ${levels.join(',')})` : ''}` +
      ` — tuần tự, ${DELAY_MS}ms/request, ước tính ${Math.ceil((words.length * DELAY_MS) / 60_000)} phút`,
  );

  let found = 0;
  let missed = 0;
  for (const [i, w] of words.entries()) {
    const query = w.meaningEn ? imageQueryFrom(w.meaningEn) : null;
    if (!query) {
      missed += 1;
      continue;
    }
    const imageUrl = await searchCommonsImage(query);
    if (imageUrl) {
      await prisma.word.update({ where: { id: w.id }, data: { imageUrl } });
      found += 1;
    } else {
      missed += 1;
    }
    if ((i + 1) % 25 === 0) {
      console.log(
        `  ${i + 1}/${words.length} — có ảnh: ${found}, không: ${missed}`,
      );
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n✓ Xong: ${found} từ có ảnh mới, ${missed} từ không tìm được.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
