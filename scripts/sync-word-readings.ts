/**
 * Đồng bộ DB ĐANG CHẠY với bản sửa cách đọc trong `words.seed.json`
 * (xem commit "fix(etl): chọn đúng cách đọc cho chữ đa âm").
 *
 * KHÔNG dùng `db:seed` để tránh đụng tới `UserWordProgress`: tiến độ người
 * dùng trỏ vào `Word.id`, xoá/tạo lại là mất sạch. Script này chỉ:
 *   1. SỬA TẠI CHỖ cách đọc + nghĩa của từ đã có (giữ nguyên id, tiến độ).
 *   2. THÊM những cách đọc thứ hai vốn bị gộp mất (vd 只 zhǐ ở HSK3).
 * KHÔNG xoá dòng nào, KHÔNG đụng `lessonId` của từ đang có.
 *
 * Từ THÊM MỚI để `lessonId = null` — lộ trình bài học trong DB được dựng từ
 * bản seed cũ, nhét từ mới vào giữa sẽ xáo trộn thứ tự bài của người đang
 * học. Chúng vẫn tra được ở từ điển/tìm kiếm; muốn đưa vào bài thì chạy
 * `migrate-lesson-themes.ts` sau (việc riêng, cân nhắc riêng).
 *
 * Mặc định CHẠY THỬ, chỉ in ra. Ghi thật: thêm `--apply`.
 * Chạy: npx tsx scripts/sync-word-readings.ts [--apply]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

interface SeedWord {
  simplified: string;
  traditional?: string | null;
  pinyin: string;
  pinyinNumeric: string;
  hskLevel: number;
  pos?: string[];
  meaningVi?: string | null;
  meaningEn?: string | null;
  hanViet?: string | null;
  audioUrl?: string | null;
  frequencyRank?: number | null;
  translationStatus?: string;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  const seed = JSON.parse(
    readFileSync(join(__dirname, '..', 'data', 'processed', 'words.seed.json'), 'utf8'),
  ) as SeedWord[];

  const rows = await prisma.word.findMany({
    select: {
      id: true,
      simplified: true,
      pinyin: true,
      pinyinNumeric: true,
      hskLevel: true,
      meaningVi: true,
    },
  });
  const byKey = new Map(rows.map((r) => [`${r.simplified}|${r.pinyinNumeric}`, r]));
  const byLevel = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.simplified}|${r.hskLevel}`;
    if (!byLevel.has(k)) byLevel.set(k, []);
    byLevel.get(k)!.push(r);
  }

  const used = new Set<string>();
  const fixes: { id: string; s: SeedWord; old: string }[] = [];
  const inserts: SeedWord[] = [];

  for (const w of seed) {
    const exact = byKey.get(`${w.simplified}|${w.pinyinNumeric}`);
    if (exact) {
      used.add(exact.id);
      continue; // cách đọc đã đúng
    }
    // cùng chữ + cùng cấp, chưa bị dùng -> chính là dòng bị chọn nhầm cách đọc
    const cand = (byLevel.get(`${w.simplified}|${w.hskLevel}`) ?? []).find(
      (r) => !used.has(r.id),
    );
    if (cand) {
      used.add(cand.id);
      fixes.push({ id: cand.id, s: w, old: `${cand.pinyin} (${cand.pinyinNumeric})` });
    } else {
      inserts.push(w);
    }
  }

  console.log(`DB hiện có ${rows.length} từ · seed có ${seed.length}`);
  console.log(`  sửa cách đọc tại chỗ: ${fixes.length}`);
  console.log(`  thêm mới:             ${inserts.length}`);
  console.log(`  không đụng tới:       ${rows.length - fixes.length}`);
  console.log('\n--- 12 ca sửa đầu tiên ---');
  for (const f of fixes.slice(0, 12))
    console.log(`  ${f.s.simplified} HSK${f.s.hskLevel}: ${f.old} -> ${f.s.pinyin} (${f.s.pinyinNumeric})`);
  console.log('\n--- 12 từ thêm mới đầu tiên ---');
  for (const i of inserts.slice(0, 12))
    console.log(`  ${i.simplified} ${i.pinyin} HSK${i.hskLevel}: ${(i.meaningVi ?? '').slice(0, 34)}`);

  if (!apply) {
    console.log('\n(chạy thử — thêm --apply để ghi thật)');
    await prisma.$disconnect();
    return;
  }

  for (const f of fixes) {
    await prisma.word.update({
      where: { id: f.id },
      data: {
        pinyin: f.s.pinyin,
        pinyinNumeric: f.s.pinyinNumeric,
        meaningVi: f.s.meaningVi ?? null,
        meaningEn: f.s.meaningEn ?? null,
        hanViet: f.s.hanViet ?? null,
      },
    });
  }
  let added = 0;
  for (const w of inserts) {
    await prisma.word.create({
      data: {
        simplified: w.simplified,
        traditional: w.traditional ?? null,
        pinyin: w.pinyin,
        pinyinNumeric: w.pinyinNumeric,
        hskLevel: w.hskLevel,
        pos: (w.pos ?? []) as never,
        meaningVi: w.meaningVi ?? null,
        meaningEn: w.meaningEn ?? null,
        hanViet: w.hanViet ?? null,
        audioUrl: w.audioUrl ?? null,
        frequencyRank: w.frequencyRank ?? null,
      },
    }).then(() => { added += 1; }).catch((e: Error) => {
      console.log(`  ! không thêm được ${w.simplified} ${w.pinyin}: ${e.message.split('\n')[0]}`);
    });
  }
  console.log(`\nĐã ghi: ${fixes.length} sửa, ${added} thêm mới`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
