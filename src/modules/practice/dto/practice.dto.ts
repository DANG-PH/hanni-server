import { PracticeSkill } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class RecordAttemptDto {
  @IsUUID()
  wordId!: string;

  @IsEnum(PracticeSkill)
  skill!: PracticeSkill;

  /** LISTENING: đúng/sai theo lựa chọn. PRONUNCIATION: đúng/sai theo nhận
   * diện giọng nói ở client (nếu trình duyệt không hỗ trợ thì bỏ trống). */
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class PracticeStatsQueryDto {
  @IsEnum(PracticeSkill)
  skill!: PracticeSkill;
}
