import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { VideoKind } from '../../../database/enums';

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
