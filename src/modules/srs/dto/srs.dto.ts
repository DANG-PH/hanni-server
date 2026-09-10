import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ReviewRating, StudySource } from '@prisma/client';

export class ReviewDto {
  @IsUUID()
  wordId!: string;

  @IsEnum(ReviewRating)
  rating!: ReviewRating;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600_000)
  durationMs?: number;

  @IsOptional()
  @IsUUID()
  studySessionId?: string;
}

export class QueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class StartSessionDto {
  @IsEnum(StudySource)
  source!: StudySource;
}
