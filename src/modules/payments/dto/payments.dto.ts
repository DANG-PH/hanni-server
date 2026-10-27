import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePremiumCheckoutDto {
  @IsString()
  planKey!: string;

  /** Cổng thanh toán: payOS (VietQR, mặc định) hoặc MoMo. */
  @IsOptional()
  @IsIn(['payos', 'momo'])
  provider?: 'payos' | 'momo';
}
