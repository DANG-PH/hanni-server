import { Exclude, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  // getter-only — nếu client lỡ gửi query trùng tên ("skip"/"take"),
  // class-transformer sẽ cố gán giá trị lên đây và crash vì không có setter.
  // @Exclude() chặn class-transformer đụng vào 2 property này khi transform.
  @Exclude()
  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  @Exclude()
  get take(): number {
    return this.pageSize;
  }
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  dto: PaginationDto,
): Paginated<T> {
  return {
    items,
    page: dto.page,
    pageSize: dto.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / dto.pageSize)),
  };
}
