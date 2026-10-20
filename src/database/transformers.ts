import type { ValueTransformer } from 'typeorm';

/**
 * Cột kiểu `date` (chỉ ngày, không giờ) ↔ `Date` lúc 00:00 UTC — đúng như Prisma trả trước đây, nên code
 * cũ so `localDate.getTime()` / `toISOString().slice(0, 10)` vẫn chạy như cũ. Driver pg được chỉnh trả
 * nguyên chuỗi 'YYYY-MM-DD' (xem `database.config.ts`), nếu không nó tự đổi sang nửa đêm GIỜ MÁY.
 */
export const dateOnly: ValueTransformer = {
  to: (value: Date | string | null | undefined) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value,
  from: (value: string | null) =>
    value == null ? value : new Date(`${value}T00:00:00.000Z`),
};

/** Cột mảng (text[], enum[]) cho phép NULL trong DB — đọc ra luôn là mảng (NULL → `[]`), như Prisma trước đây. */
export const arrayOrEmpty: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: unknown) => value ?? [],
};
