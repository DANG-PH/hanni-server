import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class GenerateQuizDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(30)
  size?: number;

  /** giới hạn trong tập từ vừa ôn (nếu client truyền lên) */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  wordIds?: string[];
}

/** Chỉ cần đúng/sai để tính điểm — client gửi thêm wordId, đáp án… thì ValidationPipe tự bỏ. */
export class QuizAnswerItemDto {
  @IsBoolean()
  isCorrect!: boolean;
}

export class SubmitQuizDto {
  @IsUUID()
  attemptId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers!: QuizAnswerItemDto[];
}
