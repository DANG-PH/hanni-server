import { IsOptional, IsString } from 'class-validator';

export class EquipFrameDto {
  /** null hoặc bỏ trống = gỡ khung đang dùng. */
  @IsOptional()
  @IsString()
  frameKey?: string | null;
}
