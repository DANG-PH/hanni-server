import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ReviewRating } from '../../../database/enums';

export class AddWordDto {
  @IsUUID()
  wordId!: string;
}

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
}

export class QueueQueryDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/** Ẩn / bỏ ẩn 1 từ khỏi hàng đợi ôn ("tôi biết từ này rồi"). */
export class SuspendWordDto {
  @IsBoolean()
  suspended!: boolean;
}
