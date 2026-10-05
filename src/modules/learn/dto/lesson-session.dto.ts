import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LessonWordResultDto {
  @IsUUID()
  wordId!: string;

  /** Số lần trả lời sai từ này trong phiên. */
  @IsInt()
  @Min(0)
  @Max(50)
  mistakes!: number;
}

export class CompleteLessonDto {
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => LessonWordResultDto)
  results!: LessonWordResultDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3_600_000)
  durationMs?: number;
}
