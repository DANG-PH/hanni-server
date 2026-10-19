import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PARTNER_KINDS = ['center', 'teacher', 'tutor', 'other'] as const;

export class CreatePartnerLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsIn(PARTNER_KINDS)
  kind!: (typeof PARTNER_KINDS)[number];

  /** Email, số điện thoại hoặc Zalo — người gửi tự chọn cách liên hệ. */
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  contact!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  /** Ô ẩn bẫy bot: người thật không thấy nên luôn để trống. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
