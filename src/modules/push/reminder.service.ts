import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  getLocalHour,
  isoDateToUtcDate,
  localStudyDate,
} from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PushService } from './push.service';

/**
 * Nhắc học tự động: mỗi giờ, tìm user có `UserSettings.reminderHour` khớp
 * giờ địa phương hiện tại VÀ chưa đạt mục tiêu ngày hôm nay — gửi push. Chạy
 * theo giờ (không phải phút) nên chỉ khớp đúng 1 lần/ngày cho từng user, trừ
 * số ít timezone lệch nửa giờ (vd Asia/Kathmandu) — chấp nhận được, không
 * cần chính xác tới phút cho một lời nhắc.
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendDueReminders(): Promise<void> {
    const now = new Date();
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });

    const users = await this.prisma.user.findMany({
      where: {
        settings: { reminderHour: { not: null } },
        pushSubscriptions: { some: {} },
      },
      select: {
        id: true,
        timezone: true,
        settings: { select: { reminderHour: true } },
      },
    });
    if (users.length === 0) return;

    let sentCount = 0;
    await Promise.all(
      users.map(async (user) => {
        const reminderHour = user.settings?.reminderHour;
        if (reminderHour == null) return;
        if (getLocalHour(now, user.timezone) !== reminderHour) return;

        const todayIso = localStudyDate(now, user.timezone, cutoffHour);
        const activity = await this.prisma.userDailyActivity.findUnique({
          where: {
            userId_localDate: {
              userId: user.id,
              localDate: isoDateToUtcDate(todayIso),
            },
          },
        });
        if (activity?.goalMet) return; // đã học đủ hôm nay, khỏi nhắc

        const sent = await this.push.sendToUser(
          user.id,
          'Đến giờ học tiếng Trung rồi!',
          'Chỉ vài phút ôn từ vựng hôm nay để giữ chuỗi ngày học của bạn nhé.',
        );
        if (sent > 0) sentCount += 1;
      }),
    );

    if (sentCount > 0) {
      this.logger.log(`Đã gửi nhắc học tới ${sentCount} người dùng`);
    }
  }
}
