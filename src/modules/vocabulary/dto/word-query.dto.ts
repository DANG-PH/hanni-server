import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class WordQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  /** lọc theo đúng 1 bài học (thay vì toàn bộ cấp HSK) */
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  /** tìm theo Hán tự / pinyin / nghĩa tiếng Việt */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  needsReview?: string;
}
