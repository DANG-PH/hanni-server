import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  getLocalHour,
  getLocalWeekday,
  isoDateToUtcDate,
  localStudyDate,
  shiftIsoDate,
} from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MailService } from './mail.service';
import { ReviewType } from '@prisma/client';

const DIGEST_HOUR = 9; // 9h sáng local — giờ mở email hợp lý, không làm phiền
const DIGEST_WEEKDAY = 1; // luxon: 1 = Thứ Hai

/**
 * Email tổng kết tuần: mỗi giờ, tìm user đang bật
 * `UserSettings.weeklyDigestEnabled` (mặc định true) mà giờ + thứ địa phương
 * khớp `DIGEST_HOUR`/`DIGEST_WEEKDAY` — tính số ngày đã học/từ đã ôn/từ mới
 * đã thuộc trong 7 ngày gần nhất (`UserDailyActivity`, mỗi dòng = 1 ngày CÓ
 * hoạt động — xem StreakService) + streak hiện tại, rồi gửi qua
 * `MailService.sendWeeklyDigest()`. Ai không học gì tuần đó vẫn nhận được
 * (bản mời quay lại thay vì bản tổng kết) — coi là re-engagement hợp lý hơn
 * là bỏ qua hoàn toàn.
 */
@Injectable()
export class WeeklyDigestService {
  private readonly logger = new Logger(WeeklyDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendWeeklyDigests(): Promise<void> {
    const now = new Date();
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });

    const users = await this.prisma.user.findMany({
      where: { settings: { weeklyDigestEnabled: true } },
      select: { id: true, email: true, displayName: true, timezone: true },
    });
    if (users.length === 0) return;

    let sentCount = 0;
    await Promise.all(
      users.map(async (user) => {
        if (getLocalHour(now, user.timezone) !== DIGEST_HOUR) return;
        if (getLocalWeekday(now, user.timezone) !== DIGEST_WEEKDAY) return;

        const todayIso = localStudyDate(now, user.timezone, cutoffHour);
        const sinceDate = isoDateToUtcDate(shiftIsoDate(todayIso, -6));

        // `UserDailyActivity.wordsLearned` chỉ tăng khi từ đạt chu kỳ ôn
        // >= 21 ngày (`becameLearned`), nên người mới học cả tuần vẫn ra 0 —
        // email tổng kết mà hiện "Từ mới đã thuộc: 0" thì phản tác dụng.
        // Đếm số từ MỚI BẮT ĐẦU học trong tuần (ReviewLog LEARN) thay vào:
        // phản ánh đúng nỗ lực và luôn dương với người có học.
        const [activity, streak, wordsStarted] = await Promise.all([
          this.prisma.userDailyActivity.findMany({
            where: { userId: user.id, localDate: { gte: sinceDate } },
            select: { wordsReviewed: true },
          }),
          this.prisma.userStreak.findUnique({ where: { userId: user.id } }),
          this.prisma.reviewLog.count({
            where: {
              userId: user.id,
              reviewType: ReviewType.LEARN,
              reviewedAt: { gte: sinceDate },
            },
          }),
        ]);

        await this.mail.sendWeeklyDigest(user.email, {
          displayName: user.displayName,
          daysStudied: activity.length,
          wordsReviewed: activity.reduce((s, a) => s + a.wordsReviewed, 0),
          wordsLearned: wordsStarted,
          currentStreak: streak?.currentStreak ?? 0,
        });
        sentCount += 1;
      }),
    );

    if (sentCount > 0) {
      this.logger.log(`Đã gửi email tổng kết tuần tới ${sentCount} người dùng`);
    }
  }
}
