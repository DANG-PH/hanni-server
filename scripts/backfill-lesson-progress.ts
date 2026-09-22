/**
 * Di trú MỘT LẦN: dựng lại `UserLessonProgress` cho dữ liệu ĐÃ CÓ.
 *
 * Bảng này trước 2026-09-22 chỉ được ĐỌC, không chỗ nào GHI (đo production:
 * 0 dòng trong khi đã có 127 lượt ôn) — xem `ProgressService.
 * recomputeLessonCache()` cho danh sách hậu quả. Sau khi sửa, tiến độ chỉ
 * được ghi từ lượt ôn TIẾP THEO trở đi, nên người đã học từ trước vẫn thấy
 * "bài đã xong = 0" và vẫn bị kẹt ở bài 1. Script này lấp phần quá khứ.
 *
 * Chỉ ghi vào `UserLessonProgress` — KHÔNG đụng `UserWordProgress`/SRS.
 * Idempotent, chạy lại vô hại.
 *
 * Chạy: npx tsx scripts/backfill-lesson-progress.ts
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  // Gom theo (user, bài) từ chính tiến độ TỪ đã có — không cần quét toàn bộ
  // người dùng, ai chưa học gì thì không có dòng nào để dựng.
  const rows = await prisma.$queryRaw<
    { userId: string; lessonId: string; started: bigint; learned: bigint }[]
  >`
    SELECT p."userId", w."lessonId",
           count(*) AS started,
           count(p."learnedAt") AS learned
    FROM "UserWordProgress" p
    JOIN "Word" w ON w.id = p."wordId"
    WHERE w."lessonId" IS NOT NULL
    GROUP BY 1, 2
  `;
  console.log(`${rows.length} cặp (người dùng, bài học) cần dựng tiến độ`);

  const lessons = await prisma.lesson.findMany({
    select: { id: true, wordCount: true },
  });
  const wordCountOf = new Map(lessons.map((l) => [l.id, l.wordCount]));

  const now = new Date();
  let done = 0;
  for (const r of rows) {
    const total = wordCountOf.get(r.lessonId) ?? 0;
    const started = Number(r.started);
    const learned = Number(r.learned);
    // "Xong bài" định nghĩa GIỐNG HỆT LearnService.path(): đã học qua mọi từ
    // trong bài ít nhất 1 lần.
    const isComplete = total > 0 && started >= total;
    const prev = await prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId: r.userId, lessonId: r.lessonId } },
    });
    await prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId: r.userId, lessonId: r.lessonId } },
      create: {
        userId: r.userId,
        lessonId: r.lessonId,
        learnedWords: learned,
        totalWords: total,
        startedAt: now,
        completedAt: isComplete ? now : null,
      },
      update: {
        learnedWords: learned,
        totalWords: total,
        startedAt: prev?.startedAt ?? now,
        completedAt: isComplete ? (prev?.completedAt ?? now) : null,
      },
    });
    done += 1;
  }

  console.log(`Xong: ${done} dòng UserLessonProgress`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
