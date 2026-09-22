/**
 * Áp bản sửa nghĩa tiếng Việt soạn tay (`data/curated/meaning-fixes.json`).
 *
 * Vì sao cần: nguồn CVDICT đôi khi dịch nguyên văn mục "variant of X" của
 * CC-CEDICT, ra những nghĩa VÒNG VO vô dụng như 歌 -> "biến thể của 歌[ge1]",
 * 玩 -> "biến thể của 玩[wan2]". Đo 2026-09-22: 156 từ dính, trong đó 30 từ ở
 * HSK1-3 — toàn từ rất thông dụng (那, 回, 歌, 玩, 花, 床, 鞋, 糖). Từ khi có
 * từ điển công khai thì mỗi từ là một trang Google đọc được, nên nghĩa hỏng
 * là hỏng ngay ngoài mặt tiền.
 *
 * Nghĩa trong file do Hanni soạn tay dựa trên nghĩa tiếng Anh sẵn có +
 * đối chiếu từ điển, KHÔNG qua dịch máy (cùng cách làm câu ví dụ HSK1).
 *
 * Mục có thêm `pinyin` là ca ETL CHỌN NHẦM CÁCH ĐỌC: với chữ đa âm, nếu
 * pinyin trong đại cương không khớp được với CC-CEDICT thì `build-words.ts`
 * rơi về `ced.pinyin[0]` — đôi khi đúng vào cách đọc hiếm, và nghĩa tiếng
 * Việt kéo theo cũng lệch. Nặng nhất là 个: đang lưu `gě` với nghĩa "dùng
 * trong 自个儿" trong khi đây là LƯỢNG TỪ THÔNG DỤNG NHẤT tiếng Trung (gè).
 * Tương tự 那 (nǎ thay vì nà), 草 (cào — biến thể tục — thay vì cǎo), 压, 并,
 * 扎, 挣, 恶, 嘛, 尽快. Chỉ sửa cột `pinyin` HIỂN THỊ, KHÔNG đụng
 * `pinyinNumeric` vì đó là khoá khớp của `seed-word-examples.ts`.
 *
 * Idempotent, chạy lại vô hại. Chạy: npx tsx scripts/apply-meaning-fixes.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

interface Fix {
  simplified: string;
  pinyinNumeric: string;
  meaningVi: string;
  pinyin?: string;
}

async function main() {
  const prisma = new PrismaClient();
  const file = join(__dirname, '..', 'data', 'curated', 'meaning-fixes.json');
  const fixes = JSON.parse(readFileSync(file, 'utf8')) as Fix[];
  console.log(`${fixes.length} mục cần áp`);

  let applied = 0;
  let missing = 0;
  for (const f of fixes) {
    const res = await prisma.word.updateMany({
      where: { simplified: f.simplified, pinyinNumeric: f.pinyinNumeric },
      data: {
        meaningVi: f.meaningVi,
        // Đánh dấu đã rà tay để phân biệt với bản dịch máy.
        translationStatus: 'REVIEWED',
        ...(f.pinyin ? { pinyin: f.pinyin } : {}),
      },
    });
    if (res.count === 0) {
      console.log(`  ! không tìm thấy ${f.simplified} (${f.pinyinNumeric})`);
      missing += 1;
    } else {
      applied += res.count;
    }
  }
  console.log(`Xong: ${applied} từ đã sửa, ${missing} mục không khớp`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
