import { OnboardingGoal } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/** Lựa chọn "mỗi ngày học bao lâu" ở khảo sát — thành mục tiêu ngày theo phút. */
export const DAILY_MINUTES_OPTIONS = [5, 10, 15, 20] as const;

export class SubmitOnboardingDto {
  @IsBoolean()
  hasStudiedBefore!: boolean;

  /** Cấp đang học (7 = HSK 7–9). Đã học mà bỏ trống = "biết một chút, chưa chắc
   * cấp nào" → client mời làm bài kiểm tra trình độ, cấp đo được đặt lộ trình sau. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  selfAssessedLevel?: number;

  @IsEnum(OnboardingGoal)
  goal!: OnboardingGoal;

  @IsBoolean()
  plansToTakeExam!: boolean;

  /** Cấp muốn thi — bắt buộc nếu `plansToTakeExam = true`. */
  @ValidateIf((o: SubmitOnboardingDto) => o.plansToTakeExam)
  @IsInt()
  @Min(1)
  @Max(9)
  targetLevel?: number;

  @ValidateIf((o: SubmitOnboardingDto) => o.plansToTakeExam)
  @IsOptional()
  @IsISO8601()
  targetDate?: string;

  /** Phút học mỗi ngày — ghi thành mục tiêu ngày (`dailyGoalType = MINUTES`). */
  @IsOptional()
  @IsIn(DAILY_MINUTES_OPTIONS)
  dailyMinutes?: number;
}
