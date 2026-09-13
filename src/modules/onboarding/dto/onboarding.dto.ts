import { OnboardingGoal } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class SubmitOnboardingDto {
  @IsBoolean()
  hasStudiedBefore!: boolean;

  /** Cấp tự đánh giá đã học tới — bắt buộc nếu `hasStudiedBefore = true`. */
  @ValidateIf((o: SubmitOnboardingDto) => o.hasStudiedBefore)
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
}
