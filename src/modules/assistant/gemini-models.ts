/** Chuỗi model Gemini thử lần lượt (model mới nhất trước, fallback dần
 * xuống bản nhẹ hơn/cũ hơn nếu bị quá tải hoặc chưa có quyền dùng) — DÙNG
 * CHUNG giữa `AssistantService` (trợ lý hỏi-đáp) và `RoleplayService`
 * (luyện nói theo tình huống) để tránh 2 danh sách lệch nhau theo thời
 * gian khi cần thêm/bớt model. */
export const CHAT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
];
