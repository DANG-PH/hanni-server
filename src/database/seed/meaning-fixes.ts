import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { Word } from '../entities';
import type { WordPos } from '../enums';

interface Fix {
  simplified: string;
  pinyinNumeric: string;
  meaningVi: string;
  pinyin?: string;
  pos?: WordPos[];
}

/**
 * Nghĩa tiếng Việt soạn tay (`data/curated/meaning-fixes.json`) đè lên bản dịch máy CVDICT — vd 歌 từng là
 * "biến thể của 歌[ge1]", 个 chọn nhầm cách đọc gě. Mục có `pinyin` sửa pinyin HIỂN THỊ (không đụng
 * `pinyinNumeric` — khoá khớp của câu ví dụ); mục có `pos` thêm từ loại cho cụm từ cố định (你好, 没关系…).
 * Production đã nạp bằng migration; ở đây cho DB mới. Chạy lại vô hại.
 */
export async function seedMeaningFixes(db: DataSource): Promise<void> {
  const file = join(
    __dirname,
    '..',
    '..',
    '..',
    'data',
    'curated',
    'meaning-fixes.json',
  );
  const fixes = JSON.parse(readFileSync(file, 'utf8')) as Fix[];
  const words = db.getRepository(Word);
  let applied = 0;
  for (const f of fixes) {
    const res = await words.update(
      { simplified: f.simplified, pinyinNumeric: f.pinyinNumeric },
      {
        meaningVi: f.meaningVi,
        // Đánh dấu đã rà tay để phân biệt với bản dịch máy.
        translationStatus: 'REVIEWED',
        needsReview: false,
        ...(f.pinyin ? { pinyin: f.pinyin } : {}),
        ...(f.pos ? { pos: f.pos } : {}),
      },
    );
    applied += res.affected ?? 0;
  }
  console.log(`  ✓ ${applied}/${fixes.length} nghĩa soạn tay`);
}
