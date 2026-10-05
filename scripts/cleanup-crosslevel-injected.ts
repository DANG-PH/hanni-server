/**
 * Dọn từ bị LỖI CŨ nhét vào lịch ôn (trước 2026-10-05): flashcard ôn tự do
 * lấy từ MỚI trên cả 9 cấp theo tần suất, nên người học HSK1 bị học 著名
 * (HSK4), 显著 (HSK6), 首批 (HSK7)... Bản sửa chặn được việc nhét THÊM, nhưng
 * các từ đã lỡ nhét vẫn nằm trong lịch ôn và đến hạn sớm nhất → mở "Ôn tập"
 * là gặp HSK6 ngay (user báo lại 2026-10-06).
 *
 * Nhận diện: lượt ôn ĐẦU TIÊN của từ là `LEARN` trong phiên ôn tự do
 * (`StudySession.source = REVIEW` — đúng đường bị lỗi) VÀ cấp của từ cao hơn
 * cấp người học (courseLevel → cấp đề xuất khảo sát → 1). Từ người dùng TỰ
 * lưu (video, từ điển — `addWord`) không có lượt LEARN đó nên không bị đụng.
 *
 * Mặc định CHẠY THỬ. `--apply` mới xoá, và trước khi xoá ghi bản sao lưu
 * (tiến độ + lịch sử ôn) ra file JSON để khôi phục được.
 * Chạy: npx tsx scripts/cleanup-crosslevel-injected.ts [--apply]
 */
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();

  const rows = await prisma.$queryRaw<
    {
      progressId: string;
      userId: string;
      email: string;
      simplified: string;
      hskLevel: number;
      userLevel: number;
    }[]
  >`
    WITH first_log AS (
      SELECT DISTINCT ON (r."progressId") r."progressId", r."reviewType", s.source
      FROM "ReviewLog" r
      LEFT JOIN "StudySession" s ON s.id = r."studySessionId"
      ORDER BY r."progressId", r."reviewedAt" ASC
    )
    SELECT p.id AS "progressId", p."userId", u.email, w.simplified, w."hskLevel",
           COALESCE(st."courseLevel", ob."recommendedLevel", 1) AS "userLevel"
    FROM "UserWordProgress" p
    JOIN first_log f ON f."progressId" = p.id
    JOIN "User" u ON u.id = p."userId"
    JOIN "Word" w ON w.id = p."wordId"
    LEFT JOIN "UserSettings" st ON st."userId" = p."userId"
    LEFT JOIN "OnboardingProfile" ob ON ob."userId" = p."userId"
    WHERE f."reviewType" = 'LEARN' AND f.source = 'REVIEW'
      AND w."hskLevel" > COALESCE(st."courseLevel", ob."recommendedLevel", 1)
    ORDER BY u.email, w."hskLevel"`;

  const byUser = new Map<string, typeof rows>();
  for (const r of rows)
    byUser.set(r.email, [...(byUser.get(r.email) ?? []), r]);
  console.log(
    `${rows.length} dòng tiến độ do lỗi cũ nhét vào, ${byUser.size} tài khoản`,
  );
  for (const [email, list] of byUser)
    console.log(
      `  ${email} (cấp ${list[0].userLevel}): ${list.length} từ — ${list
        .slice(0, 8)
        .map((r) => `${r.simplified}(HSK${r.hskLevel})`)
        .join(' ')}`,
    );

  if (!apply) {
    console.log('\n(chạy thử — thêm --apply để xoá, có sao lưu)');
    await prisma.$disconnect();
    return;
  }

  const ids = rows.map((r) => r.progressId);
  const backup = {
    at: new Date().toISOString(),
    progress: await prisma.userWordProgress.findMany({
      where: { id: { in: ids } },
    }),
    reviewLogs: await prisma.reviewLog.findMany({
      where: { progressId: { in: ids } },
    }),
  };
  const file = `cleanup-crosslevel-backup-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify(backup));
  console.log(
    `\nĐã sao lưu ${backup.progress.length} tiến độ + ${backup.reviewLogs.length} lượt ôn vào ${file}`,
  );

  const res = await prisma.userWordProgress.deleteMany({
    where: { id: { in: ids } },
  });
  console.log(
    `✓ đã xoá ${res.count} dòng tiến độ (lượt ôn liên quan xoá theo, cascade)`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
