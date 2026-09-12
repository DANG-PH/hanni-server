import { PracticeSkill } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class RecordAttemptDto {
  @IsUUID()
  wordId!: string;

  @IsEnum(PracticeSkill)
  skill!: PracticeSkill;

  /** Chỉ áp dụng cho LISTENING — PRONUNCIATION bỏ trống (chưa có chấm điểm). */
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class PracticeStatsQueryDto {
  @IsEnum(PracticeSkill)
  skill!: PracticeSkill;
}
