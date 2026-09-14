import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppEvent, type StreakUpdatedPayload } from '../../events/events';
import { DAILY_CHECKIN_REWARD, WalletService } from './wallet.service';

/**
 * Thưởng "điểm danh" hằng ngày: `AppEvent.StreakUpdated` chỉ phát khi
 * `advanceStreak()` thực sự tính streak cho 1 NGÀY MỚI (xem
 * `StreakService.recordActivity()`'s `wasNewDay`) — đúng nghĩa "hoạt động
 * đầu tiên trong ngày", nên dùng thẳng sự kiện này làm mốc điểm danh thay
 * vì phải thêm 1 hệ theo dõi riêng.
 */
@Injectable()
export class WalletListener {
  private readonly logger = new Logger(WalletListener.name);

  constructor(private readonly wallet: WalletService) {}

  @OnEvent(AppEvent.StreakUpdated, { async: true })
  async onStreakUpdated(p: StreakUpdatedPayload): Promise<void> {
    try {
      await this.wallet.credit(p.userId, DAILY_CHECKIN_REWARD, 'daily_checkin');
    } catch (err) {
      this.logger.error(`onStreakUpdated: ${(err as Error).message}`);
    }
  }
}
