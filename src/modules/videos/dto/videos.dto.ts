import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VideoKind } from '@prisma/client';

export class CreateVideoDto {
  @IsString()
  @MinLength(5)
  youtubeUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  hskLevel?: number;

  @IsOptional()
  @IsEnum(VideoKind)
  kind?: VideoKind;

  /**
   * Bản chép (tuỳ chọn): mỗi câu 1 dòng — "[mm:ss] 中文 | dịch".
   * Bỏ trống → tự lấy phụ đề tiếng Trung + mốc thời gian từ YouTube.
   */
  @IsOptional()
  @IsString()
  @MaxLength(60000)
  transcript?: string;
}

export class VideoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @IsOptional()
  @IsEnum(VideoKind)
  kind?: VideoKind;

  @IsOptional()
  @IsString()
  mine?: string;
}

export class VideoProgressDto {
  @IsInt()
  @Min(0)
  lastLineIndex!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  linesRead?: number;
}
