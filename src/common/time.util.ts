import { DateTime } from 'luxon';

/**
 * "Ngày học" theo timezone user, có tính giờ cắt ngày (cutoffHour).
 * Phiên lúc 1h sáng (cutoff = 3) vẫn tính cho ngày hôm trước — giống Anki.
 *
 * @returns chuỗi ISO date "yyyy-MM-dd" (ngày local, không kèm giờ).
 */
export function localStudyDate(
  at: Date,
  timezone: string,
  cutoffHour: number,
): string {
  const dt = DateTime.fromJSDate(at, { zone: timezone });
  const shifted = dt.hour < cutoffHour ? dt.minus({ days: 1 }) : dt;
  return shifted.toISODate() ?? shifted.toFormat('yyyy-MM-dd');
}

/** Số ngày lịch giữa 2 chuỗi ISO date (b - a). */
export function diffCalendarDays(aIso: string, bIso: string): number {
  const a = DateTime.fromISO(aIso);
  const b = DateTime.fromISO(bIso);
  return Math.round(b.diff(a, 'days').days);
}

/** Chuyển "yyyy-MM-dd" thành Date lúc 00:00 UTC (khớp cột @db.Date của Postgres). */
export function isoDateToUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Đầu ngày local kế tiếp (dùng khi lên lịch review theo interval ngày). */
export function endOfLocalDay(
  at: Date,
  timezone: string,
  cutoffHour: number,
): DateTime {
  const dt = DateTime.fromJSDate(at, { zone: timezone });
  const base = dt.hour < cutoffHour ? dt.minus({ days: 1 }) : dt;
  return base.startOf('day').plus({ days: 1, hours: cutoffHour });
}

/**
 * Thời điểm (instant UTC) bắt đầu "ngày học" hiện tại theo timezone user.
 * Dùng làm mốc `reviewedAt >= ...` để đếm việc đã làm trong ngày.
 */
export function startOfLocalDayInstant(
  at: Date,
  timezone: string,
  cutoffHour: number,
): Date {
  const dt = DateTime.fromJSDate(at, { zone: timezone });
  const base = dt.hour < cutoffHour ? dt.minus({ days: 1 }) : dt;
  return base.startOf('day').plus({ hours: cutoffHour }).toJSDate();
}
