import { Injectable } from '@nestjs/common';
import { OnboardingGoal } from '@prisma/client';
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

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.onboardingProfile.findUnique({ where: { userId } });
  }

  /**
   * Tính lộ trình đề xuất mà KHÔNG lưu và KHÔNG cần đăng nhập.
   *
   * Lý do: khảo sát vốn được thiết kế để làm TRƯỚC khi có tài khoản (kiểu
   * "gradual engagement" của Duolingo), nhưng trước đây trả lời xong 3 câu
   * thì người dùng phải đăng ký mới được xem kết quả — bỏ công ra mà chưa
   * nhận lại gì, đúng chỗ dễ rời đi nhất. Giờ xem kết quả ngay, rồi mới mời
   * tạo tài khoản để LƯU lộ trình đó.
   *
   * Dùng chung `buildRecommendation()` với `submit()`, chỉ khác là không có
   * `UserSettings` nên rơi về nhịp mặc định 20 từ/ngày.
   */
  async preview(dto: SubmitOnboardingDto) {
    const recommendedLevel = dto.hasStudiedBefore ? dto.selfAssessedLevel! : 1;
    const recommendationVi = await this.buildRecommendation(
      null,
      dto,
      recommendedLevel,
    );
    return { recommendedLevel, recommendationVi };
  }

  async submit(userId: string, dto: SubmitOnboardingDto) {
    const recommendedLevel = dto.hasStudiedBefore ? dto.selfAssessedLevel! : 1;
    const recommendationVi = await this.buildRecommendation(
      userId,
      dto,
      recommendedLevel,
    );
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : null;

    return this.prisma.onboardingProfile.upsert({
      where: { userId },
      create: {
        userId,
        hasStudiedBefore: dto.hasStudiedBefore,
        selfAssessedLevel: dto.selfAssessedLevel ?? null,
        goal: dto.goal,
        plansToTakeExam: dto.plansToTakeExam,
        targetLevel: dto.targetLevel ?? null,
        targetDate,
        recommendedLevel,
        recommendationVi,
      },
      update: {
        hasStudiedBefore: dto.hasStudiedBefore,
        selfAssessedLevel: dto.selfAssessedLevel ?? null,
        goal: dto.goal,
        plansToTakeExam: dto.plansToTakeExam,
        targetLevel: dto.targetLevel ?? null,
        targetDate,
        recommendedLevel,
        recommendationVi,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Luật đơn giản, không cần AI: cấp đề xuất = cấp tự đánh giá (ôn/củng cố
   * tiếp từ đó) hoặc HSK1 nếu chưa học bao giờ. Nếu có đặt mục tiêu thi,
   * ước tính số từ mới còn thiếu (`HskLevel.cumulative2025`) chia cho nhịp
   * học hiện tại (`UserSettings.dailyGoalValue`) ra số ngày cần học, rồi so
   * với hạn thi nếu có đặt.
   *
   * Ghi rõ từng mục (trình độ hiện tại / mục tiêu / lộ trình đề xuất) trên
   * dòng riêng thay vì gộp thành 1 câu văn xuôi — trước đây "Bạn nên bắt đầu
   * từ HSK 1... thi HSK 5" dễ đọc nhầm HSK1/HSK5 là 2 số liệu bị lẫn lộn,
   * không rõ số nào là hiện tại/số nào là mục tiêu.
   */
  private async buildRecommendation(
    userId: string | null,
    dto: SubmitOnboardingDto,
    recommendedLevel: number,
  ): Promise<string> {
    const goalText = GOAL_VI[dto.goal];
    const currentLevelText = dto.hasStudiedBefore
      ? `đã học tới khoảng HSK ${dto.selfAssessedLevel}`
      : 'chưa học tiếng Trung trước đây';

    const lines = [
      `📋 Trình độ hiện tại: ${currentLevelText}.`,
      `🎯 Mục tiêu: ${goalText}${
        dto.plansToTakeExam && dto.targetLevel
          ? `, dự định thi HSK ${dto.targetLevel}`
          : ''
      }.`,
      '',
      `👉 Lộ trình đề xuất: ${
        dto.hasStudiedBefore ? 'ôn lại, củng cố chắc' : 'bắt đầu học'
      } từ HSK ${recommendedLevel}.`,
    ];

    if (!dto.plansToTakeExam || !dto.targetLevel) return lines.join('\n');

    if (dto.targetLevel <= recommendedLevel) {
      lines.push(
        `Bạn đã ở cấp tương đương hoặc cao hơn mục tiêu thi HSK ${dto.targetLevel} rồi — tập trung ôn chắc để tự tin đi thi.`,
      );
      return lines.join('\n');
    }

    const [targetInfo, baseInfo, settings] = await Promise.all([
      this.prisma.hskLevel.findUnique({
        where: { level: dto.targetLevel },
        select: { cumulative2025: true },
      }),
      dto.hasStudiedBefore
        ? this.prisma.hskLevel.findUnique({
            where: { level: recommendedLevel },
            select: { cumulative2025: true },
          })
        : null,
      userId
        ? this.prisma.userSettings.findUnique({
            where: { userId },
            select: { dailyGoalValue: true },
          })
        : null,
    ]);
    if (!targetInfo) return lines.join('\n');

    const wordGap = targetInfo.cumulative2025 - (baseInfo?.cumulative2025 ?? 0);
    const perDay = settings?.dailyGoalValue ?? 20;
    const estDays = Math.max(1, Math.ceil(wordGap / perDay));
    const estWeeks = Math.ceil(estDays / 7);

    lines.push(
      `Từ điểm bắt đầu HSK ${recommendedLevel} lên tới mục tiêu thi HSK ${dto.targetLevel} còn khoảng ${wordGap} từ mới — với nhịp ${perDay} từ/ngày, ước tính cần khoảng ${estDays} ngày (~${estWeeks} tuần) học đều mỗi ngày.`,
    );

    if (dto.targetDate) {
      const daysUntil = Math.ceil(
        (new Date(dto.targetDate).getTime() - Date.now()) / 86_400_000,
      );
      if (daysUntil > 0) {
        const pace =
          daysUntil >= estDays * 1.2
            ? 'khá thoải mái'
            : daysUntil >= estDays
              ? 'vừa đủ — nên học đều mỗi ngày, đừng bỏ ngày nào'
              : 'khá gấp — có thể cần tăng nhịp học mỗi ngày trong phần Cài đặt';
        lines.push(
          `Còn ${daysUntil} ngày tới hạn thi bạn đặt, nhịp học hiện tại là ${pace}.`,
        );
      } else {
        lines.push(
          'Hạn thi bạn đặt đã qua rồi — cân nhắc đặt lại mục tiêu mới nhé.',
        );
      }
    }

    return lines.join('\n');
  }
}
