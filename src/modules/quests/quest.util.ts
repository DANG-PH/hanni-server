export type QuestKey =
  | 'review_words'
  | 'complete_quiz'
  | 'listening_practice'
  | 'pronunciation_practice'
  | 'new_words';

export interface QuestTemplate {
  key: QuestKey;
  title: string;
  target: number;
}

/** Kho nhiệm vụ — mỗi ngày chọn ngẫu nhiên `DAILY_QUEST_COUNT` mục, dùng
 * chính các hành động ĐÃ CÓ SẴN của app (ôn từ, làm quiz, luyện nghe/phát
 * âm, học từ mới) làm tiêu chí — không cần thêm hành động mới, và tự nhiên
 * kéo người dùng qua lại giữa các tính năng thay vì mỗi tính năng đứng 1
 * mình một cõi (đúng tinh thần "các chức năng cần liên kết với nhau"). */
export const QUEST_POOL: QuestTemplate[] = [
  { key: 'review_words', title: 'Ôn tập 15 từ vựng', target: 15 },
  {
    key: 'complete_quiz',
    title: 'Ôn thẻ rồi làm 1 bài kiểm tra nhanh',
    target: 1,
  },
  {
    key: 'listening_practice',
    title: 'Luyện nghe đúng 10 từ',
    target: 10,
  },
  {
    key: 'pronunciation_practice',
    title: 'Luyện phát âm 5 từ',
    target: 5,
  },
  { key: 'new_words', title: 'Học 5 từ mới', target: 5 },
];

export const DAILY_QUEST_COUNT = 3;
/** Xong CẢ 3 nhiệm vụ trong ngày thì được 1 lá chắn giữ chuỗi (tối đa 2) — tạo cảm giác "combo", kéo người học quay
 * lại đủ nhiều lần trong ngày. Trước 2026-10-20 thưởng xu, mà xu chỉ dùng để mua lá chắn — nay thưởng thẳng. */
export const ALL_DONE_KEY = 'all_done';

/** Hash chuỗi đơn giản (djb2) — chỉ cần đủ tốt để trộn thứ tự, không cần an
 * toàn mật mã. Dùng seed = `userId:dateIso` để mỗi user có 1 bộ 3 nhiệm vụ
 * ổn định suốt cả ngày (không đổi mỗi lần load lại trang) nhưng khác ngày
 * khác người thì khác nhau, không cần lưu DB. */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Chọn `DAILY_QUEST_COUNT` nhiệm vụ khác nhau cho 1 user trong 1 ngày —
 * deterministic (không lưu DB), tính lại ra kết quả giống hệt nhau. */
export function selectDailyQuests(
  userId: string,
  dateIso: string,
): QuestTemplate[] {
  const scored = QUEST_POOL.map((quest) => ({
    quest,
    score: hashString(`${userId}:${dateIso}:${quest.key}`),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, DAILY_QUEST_COUNT).map((s) => s.quest);
}
