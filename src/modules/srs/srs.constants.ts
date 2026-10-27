/**
 * Một từ tính là "ĐÃ THUỘC" khi đang ở trạng thái REVIEW với khoảng cách ôn ≥ ngần này ngày (≈ 3 tuần vẫn nhớ, không
 * quên lần nào). Dùng CHUNG cho mọi nơi đếm "từ đã thuộc": ôn tập (ghi `learnedAt`, gỡ "từ khó nhớ"), tiến độ, lộ trình
 * (bài đã xong), bảng xếp hạng, hồ sơ công khai, trợ lý AI. Trước 2026-10-27 số 21 khai lặp ở 6 file — đổi ở đây là cả
 * app đổi theo.
 */
export const LEARNED_INTERVAL_DAYS = 21;
