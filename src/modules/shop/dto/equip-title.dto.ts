import { IsOptional, IsString } from 'class-validator';

export class EquipTitleDto {
  /** null hoặc bỏ trống = gỡ danh hiệu đang dùng. */
  @IsOptional()
  @IsString()
  titleKey?: string | null;
}
