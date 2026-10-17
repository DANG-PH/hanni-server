import { Type } from 'class-transformer';
import { Allow, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import type { AnswerValue } from '../mock-exam.types';

/** Chấm 1 câu khi luyện từng dạng bài — chấm ngay, không lưu lượt làm. */
export class CheckPracticeDto {
  @IsString()
  @MaxLength(40)
  examSlug!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  no!: number;

  /** Số thứ tự phương án, ✓/✗ hoặc câu đã sắp xếp — sai kiểu thì tính là sai
   * (như khi nộp cả đề). */
  @Allow()
  answer!: AnswerValue | null;
}
