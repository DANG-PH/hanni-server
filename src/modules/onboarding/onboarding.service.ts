import { Injectable } from '@nestjs/common';
import { GoalType, OnboardingGoal } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { SubmitOnboardingDto } from './dto/onboarding.dto';

const GOAL_VI: Record<OnboardingGoal, string> = {
  TRAVEL: 'giao tiếp khi du lịch',
  WORK: 'phục vụ công việc',
  EXAM: 'thi lấy chứng chỉ HSK',
  ACADEMIC: 'du học',
  INTEREST: 'sở thích cá nhân, tìm hiểu văn hoá',
  OTHER: 'mục tiêu riêng của bạn',
};

/** Dữ liệu bài học gộp HSK 7–9 thành cấp 7. */
const MAX_COURSE_LEVEL = 7;
const WEEK_MS = 7 * 86_400_000;

const levelName = (level: number) =>
  level >= MAX_COURSE_LEVEL ? '7–9' : String(level);

/**
 * Lộ trình tính từ câu trả lời khảo sát — màn kết quả hiện MỖI câu trả lời
 * thành 1 dòng cụ thể (bắt đầu từ bài nào, mỗi ngày bao lâu, tới kỳ thi còn
 * bao nhiêu bài), thay cho đoạn văn chung chung trước 2026-10-18.
 */
export interface OnboardingPlan {
  /** Cấp bắt đầu (1–7); null = đã học nhưng chưa chắc cấp nào → kiểm tra trình độ. */
  startLevel: number | null;
  firstLesson: { id: string; title: string } | null;
  /** Mục tiêu phút mỗi ngày; null = mục tiêu ngày không tính theo phút. */
  dailyMinutes: number | null;
  exam: {
    level: number;
    /** Số bài + số từ từ đầu cấp bắt đầu tới hết cấp thi; null khi chưa rõ cấp bắt đầu. */
    lessons: number | null;
    words: number | null;
    /** Số tuần tới ngày thi đã đặt; null = chưa có ngày. */
    weeksLeft: number | null;
  } | null;
}

type PlanInput = Pick<
  SubmitOnboardingDto,
  'hasStudiedBefore' | 'plansToTakeExam'
> & {
  selfAssessedLevel?: number | null;
  targetLevel?: number | null;
  targetDate?: string | Date | null;
};

function startLevelOf(input: PlanInput): number | null {
  if (!input.hasStudiedBefore) return 1;
  return input.selfAssessedLevel
    ? Math.min(input.selfAssessedLevel, MAX_COURSE_LEVEL)
    : null;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const [profile, settings] = await Promise.all([
      this.prisma.onboardingProfile.findUnique({ where: { userId } }),
      this.prisma.userSettings.findUnique({
        where: { userId },
        select: { dailyGoalType: true, dailyGoalValue: true },
      }),
    ]);
    if (!profile) return null;
    const plan = await this.buildPlan(
      profile,
      settings?.dailyGoalType === GoalType.MINUTES
        ? settings.dailyGoalValue
        : null,
    );
    return { ...profile, plan };
  }

  /**
   * Tính lộ trình đề xuất mà KHÔNG lưu và KHÔNG cần đăng nhập.
   *
   * Lý do: khảo sát vốn được thiết kế để làm TRƯỚC khi có tài khoản (kiểu
   * "gradual engagement" của Duolingo), nhưng trước đây trả lời xong 3 câu
   * thì người dùng phải đăng ký mới được xem kết quả — bỏ công ra mà chưa
   * nhận lại gì, đúng chỗ dễ rời đi nhất. Giờ xem kết quả ngay, rồi mới mời
   * tạo tài khoản để LƯU lộ trình đó.
   */
  async preview(dto: SubmitOnboardingDto) {
    const plan = await this.buildPlan(dto, dto.dailyMinutes ?? null);
    return {
      recommendedLevel: plan.startLevel ?? 1,
      recommendationVi: this.buildRecommendation(dto, plan),
      plan,
    };
  }

  async submit(userId: string, dto: SubmitOnboardingDto) {
    const plan = await this.buildPlan(dto, dto.dailyMinutes ?? null);

    // Cấp bắt đầu thành cấp của lộ trình chính; "chưa chắc cấp nào" thì giữ cấp
    // cũ — bài kiểm tra trình độ đặt cấp đo thật sau. Số phút mỗi ngày thành
    // mục tiêu ngày (trước đây khảo sát không hỏi, ước tính lại dựa vào mức
    // mặc định 20 từ/ngày người học chưa từng chọn).
    const settingsData = {
      ...(plan.startLevel ? { courseLevel: plan.startLevel } : {}),
      ...(dto.dailyMinutes
        ? {
            dailyGoalType: GoalType.MINUTES,
            dailyGoalValue: dto.dailyMinutes,
          }
        : {}),
    };
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...settingsData },
      update: settingsData,
      select: { courseLevel: true },
    });

    const data = {
      hasStudiedBefore: dto.hasStudiedBefore,
      selfAssessedLevel: dto.selfAssessedLevel ?? null,
      goal: dto.goal,
      plansToTakeExam: dto.plansToTakeExam,
      targetLevel: dto.targetLevel ?? null,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      recommendedLevel: plan.startLevel ?? settings.courseLevel ?? 1,
      recommendationVi: this.buildRecommendation(dto, plan),
    };
    const profile = await this.prisma.onboardingProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data, completedAt: new Date() },
    });
    return { ...profile, plan };
  }

  /** Số bài/số từ đếm thẳng từ bài học thật (`Lesson.wordCount`), không ước lượng. */
  private async buildPlan(
    input: PlanInput,
    dailyMinutes: number | null,
  ): Promise<OnboardingPlan> {
    const startLevel = startLevelOf(input);
    const examLevel =
      input.plansToTakeExam && input.targetLevel ? input.targetLevel : null;
    const examTo = examLevel ? Math.min(examLevel, MAX_COURSE_LEVEL) : null;
    const range =
      startLevel && examTo && examTo >= startLevel
        ? { gte: startLevel, lte: examTo }
        : null;

    const [firstLesson, totals] = await Promise.all([
      startLevel
        ? this.prisma.lesson.findFirst({
            where: { hskLevel: startLevel },
            orderBy: { orderIndex: 'asc' },
            select: { id: true, title: true },
          })
        : null,
      range
        ? this.prisma.lesson.aggregate({
            where: { hskLevel: range },
            _count: true,
            _sum: { wordCount: true },
          })
        : null,
    ]);

    return {
      startLevel,
      firstLesson,
      dailyMinutes,
      exam: examLevel
        ? {
            level: examLevel,
            lessons: startLevel ? (totals?._count ?? 0) : null,
            words: startLevel ? (totals?._sum.wordCount ?? 0) : null,
            weeksLeft: input.targetDate
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(input.targetDate).getTime() - Date.now()) /
                      WEEK_MS,
                  ),
                )
              : null,
          }
        : null,
    };
  }

  /** Bản chữ của lộ trình (lưu ở `recommendationVi`), mỗi mục 1 dòng có nhãn. */
  private buildRecommendation(
    dto: SubmitOnboardingDto,
    plan: OnboardingPlan,
  ): string {
    const current = !dto.hasStudiedBefore
      ? 'chưa học tiếng Trung trước đây'
      : plan.startLevel
        ? `đang học HSK ${levelName(plan.startLevel)}`
        : 'biết một chút, chưa chắc cấp nào';
    const lines = [
      `📋 Trình độ hiện tại: ${current}.`,
      `🎯 Mục tiêu: ${GOAL_VI[dto.goal]}${
        plan.exam ? `, dự định thi HSK ${levelName(plan.exam.level)}` : ''
      }.`,
      ...(plan.dailyMinutes ? [`⏱ Mỗi ngày: ${plan.dailyMinutes} phút.`] : []),
      '',
      plan.startLevel
        ? `👉 Lộ trình đề xuất: bắt đầu từ HSK ${levelName(plan.startLevel)}.`
        : '👉 Lộ trình đề xuất: làm bài kiểm tra trình độ (khoảng 3 phút) để xếp đúng cấp.',
    ];

    const exam = plan.exam;
    if (plan.startLevel && exam?.lessons != null) {
      if (exam.lessons === 0) {
        lines.push(
          `Bạn đã ở cấp ngang hoặc trên mục tiêu thi HSK ${levelName(exam.level)} — làm đề thi thử để quen dạng bài.`,
        );
      } else {
        const perWeek = exam.weeksLeft
          ? `, còn ${exam.weeksLeft} tuần — khoảng ${Math.ceil(exam.lessons / exam.weeksLeft)} bài mỗi tuần`
          : '';
        lines.push(
          `Từ đầu HSK ${levelName(plan.startLevel)} tới hết HSK ${levelName(exam.level)}: ${exam.lessons} bài (~${exam.words} từ)${perWeek}.`,
        );
      }
    }
    return lines.join('\n');
  }
}
