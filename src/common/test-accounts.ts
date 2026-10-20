/**
 * Tài khoản thử (kiểm thử trên production bằng email dùng một lần) không được hiện ở bảng
 * xếp hạng công khai — 2026-10-19 bục vinh danh đang là "Test B", "Referred Test"... trước
 * mặt khách. Chỉ ẩn khỏi bảng xếp hạng, không đụng dữ liệu.
 */
export const TEST_EMAIL_DOMAINS = ['@mailinator.com', '@example.com'];

/** Điều kiện SQL "không phải tài khoản thử" cho bảng User có bí danh `userAlias` trong QueryBuilder. */
export function notTestAccount(userAlias: string): string {
  return TEST_EMAIL_DOMAINS.map(
    (domain) => `${userAlias}.email NOT LIKE '%${domain}'`,
  ).join(' AND ');
}
