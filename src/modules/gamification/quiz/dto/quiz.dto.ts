import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
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

export class QuizAnswerItemDto {
  @IsUUID()
  wordId!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsOptional()
  @IsString()
  chosen?: string;

  @IsOptional()
  @IsString()
  correct?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  responseMs?: number;
}

export class SubmitQuizDto {
  @IsUUID()
  attemptId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers!: QuizAnswerItemDto[];
}
