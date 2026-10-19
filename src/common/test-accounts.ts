/**
 * Tài khoản thử (kiểm thử trên production bằng email dùng một lần) không được hiện ở bảng
 * xếp hạng công khai — 2026-10-19 bục vinh danh đang là "Test B", "Referred Test"... trước
 * mặt khách. Chỉ ẩn khỏi bảng xếp hạng, không đụng dữ liệu.
 */
export const TEST_EMAIL_DOMAINS = ['@mailinator.com', '@example.com'];

/** Điều kiện Prisma cho quan hệ `user`: không phải tài khoản thử. */
export const NOT_TEST_ACCOUNT = {
  NOT: TEST_EMAIL_DOMAINS.map((d) => ({ email: { endsWith: d } })),
};
