import { QueryFailedError } from 'typeorm';

/** Mã lỗi Postgres hay gặp — https://www.postgresql.org/docs/current/errcodes-appendix.html */
const PG = {
  UNIQUE: '23505',
  FOREIGN_KEY: '23503',
  INVALID_TEXT: '22P02',
} as const;

function pgCode(err: unknown): string | undefined {
  if (!(err instanceof QueryFailedError)) return undefined;
  return (err.driverError as { code?: string } | undefined)?.code;
}

/** Trùng khoá unique — dùng khi CỐ Ý để DB chặn bản ghi trùng (vd 2 request cùng lúc), rồi xử lý êm. */
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === PG.UNIQUE;
}

export function isForeignKeyViolation(err: unknown): boolean {
  return pgCode(err) === PG.FOREIGN_KEY;
}

export function isInvalidInput(err: unknown): boolean {
  return pgCode(err) === PG.INVALID_TEXT;
}
