import { Type } from '@google/genai';
import { DateTime } from 'luxon';

export const PERIODS = ['week', 'month', 'quarter'] as const;
export type Period = (typeof PERIODS)[number];

export interface PeriodRange {
  /** Ngày đầu/cuối (ngày học local, ISO) được tính — kỳ này thì cuối = hôm nay. */
  startIso: string;
  endIso: string;
  /** Ngày cuối của cả kỳ (biểu đồ hiện đủ các ngày, "4/7 ngày"). */
  periodEndIso: string;
  /** Khoảng so sánh: CÙNG SỐ NGÀY tính từ đầu kỳ liền trước ("cùng kỳ"),
   * kỳ đã qua thì là trọn kỳ trước đó. */
  prevStartIso: string;
  prevEndIso: string;
}

const iso = (d: DateTime) => d.toISODate()!;

/** Tuần bắt đầu Thứ Hai (ISO, luxon), tháng/quý theo lịch. `offset` 0 = kỳ
 * này tới hôm nay, 1 = trọn kỳ trước. */
export function periodRange(
  todayIso: string,
  period: Period,
  offset: 0 | 1,
): PeriodRange {
  const unit = `${period}s` as const;
  const today = DateTime.fromISO(todayIso);
  const start = today.startOf(period).minus({ [unit]: offset });
  const periodEnd = start.endOf(period).startOf('day');
  const end = offset === 0 ? today : periodEnd;
  const days = Math.round(end.diff(start, 'days').days) + 1;
  const prevStart = start.minus({ [unit]: 1 });
  const prevEnd = DateTime.min(
    prevStart.plus({ days: days - 1 }),
    prevStart.endOf(period).startOf('day'),
  );
  return {
    startIso: iso(start),
    endIso: iso(end),
    periodEndIso: iso(periodEnd),
    prevStartIso: iso(prevStart),
    prevEndIso: iso(prevEnd),
  };
}

export interface DayActivity {
  iso: string;
  minutes: number;
  reviews: number;
}

export interface SeriesPoint {
  startIso: string;
  endIso: string;
  minutes: number;
  reviews: number;
}

/** Cột biểu đồ: tuần/tháng mỗi ngày 1 cột, quý gộp 7 ngày/cột (13–14 cột)
 * tính từ ngày đầu quý — cột cuối có thể ngắn hơn 7 ngày. */
export function buildSeries(
  range: PeriodRange,
  period: Period,
  activity: DayActivity[],
): SeriesPoint[] {
  const byDay = new Map(activity.map((a) => [a.iso, a]));
  const step = period === 'quarter' ? 7 : 1;
  const last = DateTime.fromISO(range.periodEndIso);
  const points: SeriesPoint[] = [];
  for (
    let d = DateTime.fromISO(range.startIso);
    d <= last;
    d = d.plus({ days: step })
  ) {
    const end = DateTime.min(d.plus({ days: step - 1 }), last);
    const point = {
      startIso: iso(d),
      endIso: iso(end),
      minutes: 0,
      reviews: 0,
    };
    for (let x = d; x <= end; x = x.plus({ days: 1 })) {
      const a = byDay.get(iso(x));
      point.minutes += a?.minutes ?? 0;
      point.reviews += a?.reviews ?? 0;
    }
    point.minutes = Math.round(point.minutes);
    points.push(point);
  }
  return points;
}

export interface PeriodStats {
  daysStudied: number;
  minutes: number;
  /** Mọi lượt chấm thẻ (học mới + ôn). */
  reviews: number;
  newWords: number;
  /** % lượt ôn nhớ được (không bấm "Quên") — `null` khi quá ít lượt ôn. */
  retention: number | null;
  lessons: number;
  listening: { total: number; correct: number };
  speaking: number;
  mockExams: { count: number; bestPercent: number | null };
}

export const hasActivity = (s: PeriodStats) =>
  s.daysStudied > 0 || s.reviews > 0 || s.lessons > 0 || s.mockExams.count > 0;

const PERIOD_VI: Record<Period, [string, string]> = {
  week: ['Tuần này', 'Tuần trước'],
  month: ['Tháng này', 'Tháng trước'],
  quarter: ['Quý này', 'Quý trước'],
};
const NEXT_VI: Record<Period, string> = {
  week: 'tuần tới',
  month: 'tháng tới',
  quarter: 'quý tới',
};

const dm = (isoDate: string) => DateTime.fromISO(isoDate).toFormat('d/M');

export function periodLabel(period: Period, offset: 0 | 1, r: PeriodRange) {
  return `${PERIOD_VI[period][offset]} (${dm(r.startIso)} – ${dm(r.endIso)})`;
}

/** Tên dạng câu (khớp `PART_INFO` phía client) — chỉ để AI gọi đúng tên. */
const PART_TYPE_VI: Record<string, string> = {
  judge: 'đối chiếu tranh đúng/sai',
  'choose-picture': 'chọn tranh',
  'match-picture': 'ghép tranh',
  'choose-text': 'chọn đáp án',
  'match-text': 'ghép câu hỏi – câu trả lời',
  'fill-blank': 'điền từ vào chỗ trống',
  'judge-text': 'xét câu ★ đúng/sai',
  order: 'sắp xếp từ thành câu',
  'pinyin-char': 'viết chữ theo pinyin',
};
const SECTION_VI: Record<string, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  writing: 'Viết',
};

export interface CoachInput {
  period: Period;
  offset: 0 | 1;
  range: PeriodRange;
  courseLevel: number | null;
  current: PeriodStats;
  previous: PeriodStats;
  streak: { current: number; longest: number };
  dueNow: number;
  weakParts: {
    level: number;
    section: string;
    part: number;
    type: string;
    correct: number;
    total: number;
  }[];
  hardWords: {
    simplified: string;
    pinyin: string;
    hanViet: string | null;
    meaningVi: string | null;
    forgot: number;
  }[];
  familiar: { count: number; examples: string[] };
}

const pct = (n: number | null) => (n === null ? 'chưa đủ lượt ôn' : `${n}%`);

/** Số liệu đưa cho AI: khoá tiếng Việt, số đã làm tròn sẵn — model chỉ việc
 * đọc, khỏi tự tính (dễ sai). */
function coachData(c: CoachInput) {
  const s = (x: PeriodStats) => ({
    soNgayHoc: x.daysStudied,
    phutHoc: x.minutes,
    luotChamThe: x.reviews,
    tuMoi: x.newWords,
    tiLeNhoKhiOn: pct(x.retention),
    baiHocXong: x.lessons,
    luyenNghe: `${x.listening.correct}/${x.listening.total} câu đúng`,
    luotLuyenPhatAm: x.speaking,
    deThiThu: x.mockExams.count
      ? `${x.mockExams.count} đề, cao nhất ${x.mockExams.bestPercent}%`
      : 'chưa làm',
  });
  const days =
    DateTime.fromISO(c.range.endIso).diff(
      DateTime.fromISO(c.range.startIso),
      'days',
    ).days + 1;
  return {
    ky: `${periodLabel(c.period, c.offset, c.range)}, ${Math.round(days)} ngày`,
    capHskDangHoc: c.courseLevel ? `HSK ${c.courseLevel}` : 'chưa chọn',
    kyNay: s(c.current),
    cungKyTruoc: s(c.previous),
    chuoiNgayHoc: { hienTai: c.streak.current, daiNhat: c.streak.longest },
    tuDenHanOnNgayBayGio: c.dueNow,
    phanThiYeu: c.weakParts.map(
      (p) =>
        `HSK ${p.level} · ${SECTION_VI[p.section] ?? p.section} phần ${p.part} (${PART_TYPE_VI[p.type] ?? p.type}): đúng ${p.correct}/${p.total}`,
    ),
    tuHayQuen: c.hardWords.map((w) => ({
      chu: w.simplified,
      pinyin: w.pinyin,
      amHanViet: w.hanViet ?? 'không có',
      nghia: w.meaningVi ?? '',
      soLanQuen: w.forgot,
    })),
    tuDaQuenNhoHanViet: c.familiar.count
      ? { soLuong: c.familiar.count, viDu: c.familiar.examples }
      : 'không có',
  };
}

export function buildCoachPrompt(c: CoachInput): string {
  return `Bạn là "Hanni Coach" — huấn luyện viên học tiếng Trung cho người Việt trong app Hanni. Viết nhận xét ${PERIOD_VI[c.period][c.offset].toLowerCase()} cho người học, dựa DUY NHẤT trên số liệu JSON cuối bài.
Yêu cầu chung: tiếng Việt, xưng "bạn", giọng ấm áp nhưng thẳng thắn, cụ thể; CHỈ dùng con số có trong dữ liệu (không bịa, không tự tính số mới); không chào hỏi, không emoji, không markdown.
Trả về JSON:
- "overview": 1–2 câu tổng quan, so với cùng kỳ trước bằng con số cụ thể.
- "wins": 1–3 điều làm tốt (mỗi điều 1 câu).
- "watch": 1–3 điều cần chú ý (ngày bỏ học, tỉ lệ nhớ giảm, phần thi yếu, từ đến hạn ôn đang dồn...). Không có gì đáng lo thì 1 câu khích lệ giữ nhịp.
- "mnemonics": với MỖI từ trong "tuHayQuen": "zh" = đúng chữ đó, "tip" = 1 mẹo nhớ ngắn, ưu tiên dựa vào âm Hán Việt ĐÃ CHO (không tự đặt âm Hán Việt khác) hoặc hình chữ/bộ thủ. Không có từ thì [].
- "plan": đúng 3 việc cho ${NEXT_VI[c.period]}, mỗi việc 1 câu có con số mục tiêu, dùng tính năng có thật của Hanni: học bài mới theo lộ trình, ôn tập flashcard, ôn riêng từ khó, luyện từng dạng bài thi thử HSK, đề thi thử HSK đầy đủ, luyện nghe, luyện phát âm, luyện nói với AI, quét ảnh để học từ trên thực đơn/biển hiệu.
Nếu có "tuDaQuenNhoHanViet", nhắc ở "wins" rằng âm Hán Việt giúp bạn nhớ nhanh (kèm 1 ví dụ trong dữ liệu).
Dữ liệu: ${JSON.stringify(coachData(c))}`;
}

const LIST = { type: Type.ARRAY, items: { type: Type.STRING } };
export const COACH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: { type: Type.STRING },
    wins: LIST,
    watch: LIST,
    mnemonics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { zh: { type: Type.STRING }, tip: { type: Type.STRING } },
        required: ['zh', 'tip'],
      },
    },
    plan: LIST,
  },
  required: ['overview', 'wins', 'watch', 'mnemonics', 'plan'],
};

export interface CoachSummary {
  overview: string;
  wins: string[];
  watch: string[];
  mnemonics: { zh: string; tip: string }[];
  plan: string[];
}

/** Kiểm lại JSON của model (khuôn đã ép nhưng dữ liệu từ ngoài vào). */
export function parseCoachJson(text: string): CoachSummary | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const strings = (v: unknown, max: number) =>
    (Array.isArray(v) ? v : [])
      .filter((x): x is string => typeof x === 'string' && !!x.trim())
      .map((x) => x.trim())
      .slice(0, max);
  if (typeof o.overview !== 'string' || !o.overview.trim()) return null;
  return {
    overview: o.overview.trim(),
    wins: strings(o.wins, 3),
    watch: strings(o.watch, 3),
    mnemonics: (Array.isArray(o.mnemonics) ? o.mnemonics : [])
      .flatMap((m: unknown) => {
        const { zh, tip } = (m ?? {}) as Record<string, unknown>;
        return typeof zh === 'string' && typeof tip === 'string' && tip.trim()
          ? [{ zh: zh.trim(), tip: tip.trim() }]
          : [];
      })
      .slice(0, 5),
    plan: strings(o.plan, 3),
  };
}
