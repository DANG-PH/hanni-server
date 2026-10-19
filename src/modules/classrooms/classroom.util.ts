/**
 * Lớp học (2026-10-19) — hàm thuần để test được: mã vào lớp, chuẩn hoá mã người
 * dùng gõ, trạng thái hoàn thành bài giao.
 */

/** Không có chữ dễ nhầm khi đọc cho học viên chép lại: 0/O, 1/I/L. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export const MAX_CLASSES_PER_OWNER = 20;
export const MAX_MEMBERS_PER_CLASS = 200;
export const MAX_ASSIGNMENTS_PER_CLASS = 60;

export function makeClassCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++)
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return out;
}

/** "hn4k-7p", " HN 4K7P " → "HN4K7P" (bỏ khoảng trắng, gạch, viết hoa). */
export function normalizeClassCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export interface AssignmentLike {
  kind: 'LESSON' | 'MOCK_EXAM';
  lessonId: string | null;
  examSlug: string | null;
  createdAt: Date;
}

/** Bài học: xong khi đã hoàn thành bài (kể cả trước lúc giao — đã học rồi thì
 * không bắt học lại). Đề thi thử: phải làm SAU lúc giao, vì giáo viên giao đề
 * là để xem trình độ hiện tại. */
export function isAssignmentDone(
  a: AssignmentLike,
  completedLessonIds: Set<string>,
  examAttempts: { examSlug: string; createdAt: Date }[],
): boolean {
  if (a.kind === 'LESSON')
    return !!a.lessonId && completedLessonIds.has(a.lessonId);
  return examAttempts.some(
    (t) => t.examSlug === a.examSlug && t.createdAt >= a.createdAt,
  );
}
