import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import type { AnswerValue } from '../mock-exam.types';

export class SubmitMockExamDto {
  /** `answers[no - 1]` = đáp án câu `no`: số thứ tự phương án, `true`/`false`
   * (câu ✓/✗) hoặc `null` (bỏ trống). Kiểu từng câu được đối chiếu khi chấm —
   * sai kiểu thì tính như bỏ trống. */
  @IsArray()
  @ArrayMaxSize(200)
  answers!: (AnswerValue | null)[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4 * 3600)
  durationSec?: number;
}
