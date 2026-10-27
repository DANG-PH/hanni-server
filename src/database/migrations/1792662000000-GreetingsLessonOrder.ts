import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bài 1 HSK 1 "Chào hỏi & giao tiếp xã giao" xếp theo thứ tự soạn tay (2026-10-27): theo tần suất thì bài mở đầu bằng
 * 不客气 "không có chi" còn 你好 đứng CUỐI — người mới bấm "Học bài đầu tiên" gặp "không có chi" trước "xin chào", và
 * thẻ đầu tiên không có mẹo thanh điệu Hán Việt nào (你好: nễ → thanh 3 ✓, hảo → thanh 3 ✓). Nguồn: `curatedOrderThemes`
 * ở data/curated/lesson-themes-hsk1.json (scripts/import/build-words.ts) — seed dựng lại ra đúng thứ tự này.
 * Chỉ đổi 7 dòng, mỗi dòng chỉ khi giá trị hiện tại đúng giá trị cũ; chạy lại không đổi gì. Không đụng tiến độ người
 * học (SRS gắn theo từ, không theo vị trí trong bài).
 */
const ORDER: [
  simplified: string,
  pinyinNumeric: string,
  from: number,
  to: number,
][] = [
  ['你好', 'ni3 hao3', 10, 1],
  ['不客气', 'bu4 ke4 qi5', 1, 3],
  ['请', 'qing3', 3, 5],
  ['请问', 'qing3 wen4', 8, 6],
  ['再见', 'zai4 jian4', 6, 7],
  ['喂', 'wei4', 5, 8],
  ['没关系', 'mei2 guan1 xi5', 7, 10],
];

export class GreetingsLessonOrder1792662000000 implements MigrationInterface {
  name = 'GreetingsLessonOrder1792662000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [simplified, pinyinNumeric, from, to] of ORDER)
      await queryRunner.query(
        `UPDATE "Word" SET "lessonOrder" = $1, "updatedAt" = now()
         WHERE "simplified" = $2 AND "pinyinNumeric" = $3 AND "hskLevel" = 1 AND "lessonOrder" = $4`,
        [to, simplified, pinyinNumeric, from],
      );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [simplified, pinyinNumeric, from, to] of ORDER)
      await queryRunner.query(
        `UPDATE "Word" SET "lessonOrder" = $1, "updatedAt" = now()
         WHERE "simplified" = $2 AND "pinyinNumeric" = $3 AND "hskLevel" = 1 AND "lessonOrder" = $4`,
        [from, simplified, pinyinNumeric, to],
      );
  }
}
