import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';
import { PERIODS, type Period } from '../report.util';

export class ReportQueryDto {
  @IsIn(PERIODS)
  period: Period = 'week';

  /** 0 = kỳ này (tới hôm nay), 1 = kỳ trước. */
  @Type(() => Number)
  @IsIn([0, 1])
  offset: 0 | 1 = 0;
}
