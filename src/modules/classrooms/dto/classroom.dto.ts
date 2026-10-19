import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  /** Cấp HSK của lớp (1–7, 7 = HSK 7–9) — gợi ý bài/đề khi giao. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  hskLevel?: number;
}

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  hskLevel?: number;
}

export class CreateAssignmentDto {
  @IsIn(['LESSON', 'MOCK_EXAM'])
  kind!: 'LESSON' | 'MOCK_EXAM';

  @ValidateIf((o: CreateAssignmentDto) => o.kind === 'LESSON')
  @IsUUID()
  lessonId?: string;

  @ValidateIf((o: CreateAssignmentDto) => o.kind === 'MOCK_EXAM')
  @IsString()
  @MaxLength(40)
  examSlug?: string;

  /** Hạn nộp (ISO) — bỏ trống = không hạn. */
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
