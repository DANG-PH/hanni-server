import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Giới hạn 1 lần nạp — chặn nhầm lẫn/lạm dụng ở giai đoạn đầu (chưa có
 * lịch sử giao dịch thật để tinh chỉnh), không phải giới hạn kỹ thuật của
 * payOS. Có thể nới sau khi vận hành ổn định. */
export const MIN_TOPUP_VND = 10_000;
export const MAX_TOPUP_VND = 2_000_000;

export class CreateTopUpDto {
  @Type(() => Number)
  @IsInt()
  @Min(MIN_TOPUP_VND)
  @Max(MAX_TOPUP_VND)
  amountVnd!: number;
}
