import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import {
  User,
  UserDailyActivity,
  UserWordProgress,
} from '../../database/entities';
import { SrsState } from '../../database/enums';
import {
  getLocalHour,
  getLocalWeekday,
  isoDateToUtcDate,
  localStudyDate,
} from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { PushService } from './push.service';

/** Điều kiện SQL: người dùng (bí danh `u`) có ít nhất 1 thiết bị đăng ký nhận push. */
const HAS_PUSH_DEVICE =
  'EXISTS (SELECT 1 FROM "PushSubscription" ps WHERE ps."userId" = u.id)';

const ACTIVE_SRS_STATES: SrsState[] = [
  SrsState.LEARNING,
  SrsState.REVIEW,
  SrsState.RELEARNING,
];

/** Giờ địa phương gửi cảnh báo "sắp mất chuỗi" — cố định (không cho user tự
 * chỉnh như `reminderHour`), chọn buổi tối để còn kịp học trước khi ngày học
 * kết thúc (`STREAK_DAY_CUTOFF_HOUR` thật ra là 3h sáng hôm sau, nhưng nhắc
 * lúc đó thì phiền — 21h vẫn còn vài tiếng mà không làm phiền giấc ngủ). */
const STREAK_RISK_HOUR = 21;

/** Thứ Sáu/Thứ Bảy (ISO: 5, 6) — 2 ngày mất streak nhiều nhất theo research
 * hành vi Duolingo (bận đi chơi/tụ tập cuối tuần) — nhắc SỚM hơn thêm 1 lần
 * ngoài lời nhắc `STREAK_RISK_HOUR` thường, để còn kịp học trước khi bận. */
const WEEKEND_RISK_WEEKDAYS = [5, 6];
const WEEKEND_EARLY_RISK_HOUR = 17;

/**
 * Nhắc học tự động: mỗi giờ, tìm user có `UserSettings.reminderHour` khớp
 * giờ địa phương hiện tại VÀ chưa đạt mục tiêu ngày hôm nay — gửi push. Chạy
 * theo giờ (không phải phút) nên chỉ khớp đúng 1 lần/ngày cho từng user, trừ
 * số ít timezone lệch nửa giờ (vd Asia/Kathmandu) — chấp nhận được, không
 * cần chính xác tới phút cho một lời nhắc.
 *
 * Ngoài ra còn cảnh báo riêng "sắp mất chuỗi" (`sendStreakRiskReminders()`)
 * lúc `STREAK_RISK_HOUR` cho ai có streak > 0 nhưng CHƯA có hoạt động nào
 * hôm nay — khác điều kiện với nhắc thường (dựa vào `goalMet`) vì streak chỉ
 * cần hoạt động ĐẦU TIÊN trong ngày là giữ được (xem `StreakService.
 * recordActivity()`'s `wasNewDay`), không cần đạt đủ mục tiêu. Riêng thứ
 * Sáu/thứ Bảy có thêm `sendWeekendEarlyRiskReminders()` gửi SỚM hơn lúc
 * `WEEKEND_EARLY_RISK_HOUR` — không thay thế lời nhắc 21h, cả 2 job đều tự
 * kiểm tra lại `UserDailyActivity` nên không gửi trùng nếu đã học ở giữa.
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserDailyActivity)
    private readonly activities: Repository<UserDailyActivity>,
    @InjectRepository(UserWordProgress)
    private readonly progress: Repository<UserWordProgress>,
    private readonly push: PushService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendDueReminders(): Promise<void> {
    const now = new Date();
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });

    // Ai đã đặt giờ nhắc VÀ có ít nhất 1 thiết bị nhận thông báo đẩy.
    const users = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.settings', 'settings')
      .select([
        'u.id',
        'u.timezone',
        'settings.userId',
        'settings.reminderHour',
      ])
      .where('settings.reminderHour IS NOT NULL')
      .andWhere(HAS_PUSH_DEVICE)
      .getMany();
    if (users.length === 0) return;

    let sentCount = 0;
    await Promise.all(
      users.map(async (user) => {
        const reminderHour = user.settings?.reminderHour;
        if (reminderHour == null) return;
        if (getLocalHour(now, user.timezone) !== reminderHour) return;

        const todayIso = localStudyDate(now, user.timezone, cutoffHour);
        const activity = await this.activities.findOneBy({
          userId: user.id,
          localDate: isoDateToUtcDate(todayIso),
        });
        if (activity?.goalMet) return; // đã học đủ hôm nay, khỏi nhắc

        // Nhắc CỤ THỂ số từ đến hạn thay vì câu chung chung — thông báo có
        // số liệu thật đã được ghi nhận là hiệu quả hơn nhiều so với nhắc
        // nhở mơ hồ (nghiên cứu hành vi push notification: cá nhân hoá tăng
        // tỷ lệ mở đáng kể so với nội dung generic).
        const dueCount = await this.progress.countBy({
          userId: user.id,
          isSuspended: false,
          state: In(ACTIVE_SRS_STATES),
          dueAt: LessThanOrEqual(now),
        });
        // Diễn đạt theo hướng MẤT MÁT thay vì nhiệm vụ: "N từ sắp quên" thúc
        // đẩy mạnh hơn "N từ cần ôn" (loss aversion — người ta ngại mất cái
        // đã có hơn ngại bỏ lỡ việc mới). Cùng hướng với thẻ thống kê ở
        // dashboard.
        const body =
          dueCount > 0
            ? `${dueCount} từ bạn đã học đang sắp quên — ôn vài phút để giữ lại nhé!`
            : 'Học thêm vài từ mới hôm nay để mở rộng vốn từ nhé.';

        const sent = await this.push.sendToUser(
          user.id,
          'Đến giờ học tiếng Trung rồi!',
          body,
        );
        if (sent > 0) sentCount += 1;
      }),
    );

    if (sentCount > 0) {
      this.logger.log(`Đã gửi nhắc học tới ${sentCount} người dùng`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendStreakRiskReminders(): Promise<void> {
    const now = new Date();
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });

    const users = await this.usersOnStreakWithPush();
    if (users.length === 0) return;

    let sentCount = 0;
    await Promise.all(
      users.map(async (user) => {
        if (getLocalHour(now, user.timezone) !== STREAK_RISK_HOUR) return;

        const todayIso = localStudyDate(now, user.timezone, cutoffHour);
        const activity = await this.activities.findOneBy({
          userId: user.id,
          localDate: isoDateToUtcDate(todayIso),
        });
        if (activity) return; // đã có hoạt động hôm nay -> streak đã an toàn

        const streakDays = user.streak?.currentStreak ?? 0;
        const sent = await this.push.sendToUser(
          user.id,
          `Đừng để mất chuỗi ${streakDays} ngày!`,
          'Bạn chưa học gì hôm nay — học ngay vài phút để giữ chuỗi nhé.',
        );
        if (sent > 0) sentCount += 1;
      }),
    );

    if (sentCount > 0) {
      this.logger.log(`Đã gửi cảnh báo mất chuỗi tới ${sentCount} người dùng`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendWeekendEarlyRiskReminders(): Promise<void> {
    const now = new Date();
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });

    const users = await this.usersOnStreakWithPush();
    if (users.length === 0) return;

    let sentCount = 0;
    await Promise.all(
      users.map(async (user) => {
        if (
          !WEEKEND_RISK_WEEKDAYS.includes(getLocalWeekday(now, user.timezone))
        )
          return;
        if (getLocalHour(now, user.timezone) !== WEEKEND_EARLY_RISK_HOUR)
          return;

        const todayIso = localStudyDate(now, user.timezone, cutoffHour);
        const activity = await this.activities.findOneBy({
          userId: user.id,
          localDate: isoDateToUtcDate(todayIso),
        });
        if (activity) return; // đã có hoạt động hôm nay -> streak đã an toàn

        const streakDays = user.streak?.currentStreak ?? 0;
        const sent = await this.push.sendToUser(
          user.id,
          `Cuối tuần rồi, đừng quên chuỗi ${streakDays} ngày!`,
          'Cuối tuần dễ bận đi chơi rồi quên mất — học vài phút ngay bây giờ cho chắc nhé.',
        );
        if (sent > 0) sentCount += 1;
      }),
    );

    if (sentCount > 0) {
      this.logger.log(`Đã gửi nhắc sớm cuối tuần tới ${sentCount} người dùng`);
    }
  }

  /** Ai đang có chuỗi ngày học (> 0) VÀ có ít nhất 1 thiết bị nhận thông báo đẩy. */
  private usersOnStreakWithPush() {
    return this.users
      .createQueryBuilder('u')
      .innerJoin('u.streak', 'streak')
      .select(['u.id', 'u.timezone', 'streak.userId', 'streak.currentStreak'])
      .where('streak.currentStreak > 0')
      .andWhere(HAS_PUSH_DEVICE)
      .getMany();
  }
}
