import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import {
  And,
  Between,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  isoDateToUtcDate,
  localStudyDate,
  shiftIsoDate,
} from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import {
  MockExamAttempt,
  PracticeAttempt,
  ReviewLog,
  User,
  UserDailyActivity,
  UserLessonProgress,
  UserWordProgress,
  Word,
} from '../../database/entities';
import {
  PracticeSkill,
  ReviewRating,
  ReviewType,
  SrsState,
} from '../../database/enums';
import { RedisService } from '../../infra/redis/redis.service';
import { CHAT_MODELS } from '../assistant/gemini-models';
import { StreakService } from '../gamification/streak/streak.service';
import { partStats, SECTION_SLUG } from '../mock-exams/mock-exam.content';
import { isPremiumActive } from '../premium/premium-plans';
import { hanVietMatchesMeaning } from '../vocabulary/words.service';
import {
  buildCoachPrompt,
  buildSeries,
  COACH_SCHEMA,
  hasActivity,
  parseCoachJson,
  periodRange,
  type CoachSummary,
  type Period,
  type PeriodStats,
} from './report.util';

/** Ít lượt ôn hơn thế này thì tỉ lệ nhớ chưa nói lên gì. */
const MIN_REVIEWS_FOR_RETENTION = 10;
/** Phần thi "yếu": đủ câu để kết luận và đúng dưới 75%. */
const WEAK_PART_MIN_TOTAL = 4;
const WEAK_PART_RATE = 0.75;
const DAY_SEC = 86_400;

/** Điều kiện "trong khoảng [gte, lt)" cho cột thời gian. */
const within = (span: Span) =>
  And(MoreThanOrEqual(span.gte), LessThan(span.lt));

interface Span {
  gte: Date;
  lt: Date;
}

/**
 * Báo cáo học tập theo tuần/tháng/quý (ai cũng xem được — chỉ là số liệu của
 * chính mình) + "Hanni Coach": nhận xét, mẹo nhớ từ hay quên dựa trên âm Hán
 * Việt và kế hoạch kỳ tới bằng Gemini — tiện ích AI của Premium.
 */
@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private readonly genAI: GoogleGenAI | null;
  private readonly cutoffHour: number;

  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(ReviewLog)
    private readonly reviewLogs: Repository<ReviewLog>,
    @InjectRepository(UserWordProgress)
    private readonly wordProgress: Repository<UserWordProgress>,
    @InjectRepository(UserDailyActivity)
    private readonly activities: Repository<UserDailyActivity>,
    @InjectRepository(UserLessonProgress)
    private readonly lessonProgress: Repository<UserLessonProgress>,
    @InjectRepository(PracticeAttempt)
    private readonly practiceAttempts: Repository<PracticeAttempt>,
    @InjectRepository(MockExamAttempt)
    private readonly mockAttempts: Repository<MockExamAttempt>,
    private readonly redis: RedisService,
    private readonly streaks: StreakService,
  ) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.cutoffHour = config.get('STREAK_DAY_CUTOFF_HOUR', { infer: true });
  }

  async report(userId: string, period: Period, offset: 0 | 1) {
    const user = await this.users.findOneOrFail({
      where: { id: userId },
      relations: { settings: true },
      select: {
        id: true,
        timezone: true,
        premiumUntil: true,
        settings: { userId: true, courseLevel: true },
      },
    });
    const todayIso = localStudyDate(new Date(), user.timezone, this.cutoffHour);
    const range = periodRange(todayIso, period, offset);
    // Ngày học bắt đầu lúc STREAK_DAY_CUTOFF_HOUR theo giờ của user.
    const dayStart = (isoDate: string) =>
      DateTime.fromISO(isoDate, { zone: user.timezone })
        .startOf('day')
        .plus({ hours: this.cutoffHour })
        .toJSDate();
    const span = (a: string, b: string): Span => ({
      gte: dayStart(a),
      lt: dayStart(shiftIsoDate(b, 1)),
    });
    const now = span(range.startIso, range.endIso);

    const [current, previous, forgot, learned, streak, dueNow, leechCount] =
      await Promise.all([
        this.collect(userId, range.startIso, range.endIso, now),
        this.collect(
          userId,
          range.prevStartIso,
          range.prevEndIso,
          span(range.prevStartIso, range.prevEndIso),
        ),
        // 3 từ bấm "Quên" nhiều nhất trong kỳ.
        this.reviewLogs
          .createQueryBuilder('log')
          .select('log.wordId', 'wordId')
          .addSelect('COUNT(*)::int', 'count')
          .where({
            userId,
            reviewedAt: within(now),
            rating: ReviewRating.AGAIN,
          })
          .groupBy('log.wordId')
          .orderBy('COUNT(*)', 'DESC')
          .limit(3)
          .getRawMany<{ wordId: string; count: number }>(),
        // Các từ MỚI học trong kỳ (mỗi từ 1 lần).
        this.reviewLogs
          .createQueryBuilder('log')
          .select('DISTINCT log.wordId', 'wordId')
          .where({
            userId,
            reviewType: ReviewType.LEARN,
            reviewedAt: within(now),
          })
          .getRawMany<{ wordId: string }>(),
        this.streaks.getStreak(userId),
        this.wordProgress.countBy({
          userId,
          isSuspended: false,
          state: In([SrsState.LEARNING, SrsState.REVIEW, SrsState.RELEARNING]),
          dueAt: LessThanOrEqual(new Date()),
        }),
        this.wordProgress.countBy({ userId, isLeech: true }),
      ]);

    const [forgotWords, learnedWords] = await Promise.all([
      this.words.find({
        where: { id: In(forgot.map((f) => f.wordId)) },
        select: {
          id: true,
          simplified: true,
          pinyin: true,
          hanViet: true,
          meaningVi: true,
        },
      }),
      this.words.find({
        where: { id: In(learned.map((l) => l.wordId)) },
        select: { id: true, simplified: true, hanViet: true, meaningVi: true },
      }),
    ]);
    const familiar = learnedWords.filter(hanVietMatchesMeaning);

    return {
      period,
      offset,
      ...range,
      current: current.stats,
      previous: previous.stats,
      series: buildSeries(range, period, current.days),
      weakParts: partStats(current.mocks)
        .filter(
          (p) =>
            p.total >= WEAK_PART_MIN_TOTAL &&
            p.correct / p.total < WEAK_PART_RATE,
        )
        .sort((a, b) => a.correct / a.total - b.correct / b.total)
        .slice(0, 2)
        .map((p) => ({
          ...p,
          slug: `hsk${p.level}-${SECTION_SLUG[p.section]}-${p.part}`,
        })),
      hardWords: forgot.flatMap((f) => {
        const w = forgotWords.find((x) => x.id === f.wordId);
        return w ? [{ ...w, forgot: f.count }] : [];
      }),
      familiar: {
        count: familiar.length,
        examples: familiar
          .slice(0, 3)
          .map((w) => ({ simplified: w.simplified, hanViet: w.hanViet! })),
      },
      streak: {
        current: streak?.currentStreak ?? 0,
        longest: streak?.longestStreak ?? 0,
      },
      dueNow,
      leechCount,
      courseLevel: user.settings?.courseLevel ?? null,
      ai: {
        premium: isPremiumActive(user.premiumUntil),
        enabled: !!this.genAI,
      },
    };
  }

  /** Nhận xét của Hanni Coach cho kỳ đó — chỉ Premium. Lưu Redis theo "dấu
   * vân tay" số liệu: bấm lại khi chưa học thêm thì trả bản cũ, học thêm thì
   * viết lại cho khớp số mới. */
  async coach(userId: string, period: Period, offset: 0 | 1) {
    const report = await this.report(userId, period, offset);
    if (!report.ai.premium) {
      throw new ForbiddenException(
        'Nhận xét bằng AI (Hanni Coach) dành cho tài khoản Premium.',
      );
    }
    if (!this.genAI) {
      throw new BadRequestException(
        'Hanni Coach đang tạm đóng — thử lại sau nhé.',
      );
    }
    const c = report.current;
    // Chưa học gì thì không có gì để nhận xét — khỏi gọi AI.
    if (!hasActivity(c)) return { summary: null, generatedAt: null };

    const key = [
      'insights:coach',
      userId,
      period,
      report.startIso,
      report.endIso,
      c.reviews,
      c.daysStudied,
      c.lessons,
      c.mockExams.count,
      c.listening.total,
      c.speaking,
    ].join(':');
    const cached = await this.redis
      .getJson<{ summary: CoachSummary; generatedAt: string }>(key)
      .catch(() => null);
    if (cached) return cached;

    const prompt = buildCoachPrompt({
      period,
      offset,
      range: report,
      courseLevel: report.courseLevel,
      current: report.current,
      previous: report.previous,
      streak: report.streak,
      dueNow: report.dueNow,
      weakParts: report.weakParts,
      hardWords: report.hardWords,
      familiar: {
        count: report.familiar.count,
        examples: report.familiar.examples.map(
          (w) => `${w.simplified} ${w.hanViet}`,
        ),
      },
    });
    for (const model of CHAT_MODELS) {
      try {
        const response = await this.genAI.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: COACH_SCHEMA,
          },
        });
        const summary = response.text ? parseCoachJson(response.text) : null;
        if (!summary) continue;
        const out = { summary, generatedAt: new Date().toISOString() };
        await this.redis
          .setJson(key, out, offset === 0 ? DAY_SEC : 30 * DAY_SEC)
          .catch(() => undefined);
        return out;
      } catch (err) {
        this.logger.warn(
          `[Insights] model ${model} lỗi: ${(err as Error).message}`,
        );
      }
    }
    throw new ServiceUnavailableException(
      'Hanni Coach đang bận, thử lại sau ít phút nhé.',
    );
  }

  private async collect(
    userId: string,
    startIso: string,
    endIso: string,
    when: Span,
  ) {
    const [days, reviews, lessons, practice, mocks] = await Promise.all([
      this.activities.find({
        where: {
          userId,
          localDate: Between(
            isoDateToUtcDate(startIso),
            isoDateToUtcDate(endIso),
          ),
        },
        select: {
          id: true,
          localDate: true,
          minutesStudied: true,
          wordsReviewed: true,
        },
      }),
      // Số lượt chấm thẻ theo (loại lượt, mức đánh giá).
      this.reviewLogs
        .createQueryBuilder('log')
        .select(['log.reviewType AS "reviewType"', 'log.rating AS "rating"'])
        .addSelect('COUNT(*)::int', 'count')
        .where({ userId, reviewedAt: within(when) })
        .groupBy('log.reviewType')
        .addGroupBy('log.rating')
        .getRawMany<{
          reviewType: ReviewType;
          rating: ReviewRating;
          count: number;
        }>(),
      this.lessonProgress.countBy({ userId, completedAt: within(when) }),
      // Số lượt luyện nghe/phát âm theo (kỹ năng, đúng/sai).
      this.practiceAttempts
        .createQueryBuilder('p')
        .select(['p.skill AS "skill"', 'p.isCorrect AS "isCorrect"'])
        .addSelect('COUNT(*)::int', 'count')
        .where({ userId, createdAt: within(when) })
        .groupBy('p.skill')
        .addGroupBy('p.isCorrect')
        .getRawMany<{
          skill: PracticeSkill;
          isCorrect: boolean | null;
          count: number;
        }>(),
      this.mockAttempts.find({
        where: { userId, createdAt: within(when) },
        select: {
          id: true,
          examSlug: true,
          score: true,
          maxScore: true,
          answers: true,
        },
      }),
    ]);

    const total = (rows: { count: number }[]) =>
      rows.reduce((n, r) => n + r.count, 0);
    // Tỉ lệ nhớ chỉ tính lượt ÔN thật (không tính lần đầu học từ mới).
    const srs = reviews.filter(
      (r) =>
        r.reviewType === ReviewType.REVIEW ||
        r.reviewType === ReviewType.RELEARN,
    );
    const srsTotal = total(srs);
    const srsPass = total(srs.filter((r) => r.rating !== ReviewRating.AGAIN));
    const listening = practice.filter(
      (p) => p.skill === PracticeSkill.LISTENING,
    );

    const stats: PeriodStats = {
      daysStudied: days.length,
      minutes: Math.round(days.reduce((n, d) => n + d.minutesStudied, 0)),
      reviews: total(reviews),
      newWords: total(reviews.filter((r) => r.reviewType === ReviewType.LEARN)),
      retention:
        srsTotal >= MIN_REVIEWS_FOR_RETENTION
          ? Math.round((srsPass / srsTotal) * 100)
          : null,
      lessons,
      listening: {
        total: total(listening),
        correct: total(listening.filter((p) => p.isCorrect === true)),
      },
      speaking: total(
        practice.filter((p) => p.skill === PracticeSkill.PRONUNCIATION),
      ),
      mockExams: {
        count: mocks.length,
        bestPercent: mocks.length
          ? Math.max(
              ...mocks.map((m) => Math.round((m.score / m.maxScore) * 100)),
            )
          : null,
      },
    };
    return {
      stats,
      mocks,
      days: days.map((d) => ({
        iso: d.localDate.toISOString().slice(0, 10),
        minutes: d.minutesStudied,
        reviews: d.wordsReviewed,
      })),
    };
  }
}
