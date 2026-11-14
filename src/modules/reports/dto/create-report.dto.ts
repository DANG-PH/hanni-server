import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_KINDS = ['ai', 'user', 'account-deletion'] as const;
export const REPORT_REASONS = [
  'offensive',
  'sexual',
  'dangerous',
  'wrong',
  'other',
  'account-deletion',
] as const;
export const REPORT_FEATURES = [
  'assistant',
  'roleplay',
  'analyze',
  'sentence-check',
  'mnemonic',
  'coach',
] as const;

export class CreateReportDto {
  @IsIn(REPORT_KINDS)
  kind!: (typeof REPORT_KINDS)[number];

  @IsIn(REPORT_REASONS)
  reason!: (typeof REPORT_REASONS)[number];

  @IsOptional()
  @IsIn(REPORT_FEATURES)
  feature?: (typeof REPORT_FEATURES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetId?: string;

  /** Nội dung bị báo cáo — nhận tới 20.000 ký tự cho khỏi báo lỗi, lưu 4.000 ký tự đầu. */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Email tài khoản cần xoá (yêu cầu xoá gửi từ web khi chưa đăng nhập). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;

  /** Ô ẩn bẫy bot: người thật không thấy nên luôn để trống. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
