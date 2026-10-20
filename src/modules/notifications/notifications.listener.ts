import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '../../database/enums';
import {
  AppEvent,
  type AchievementUnlockedPayload,
  type ClassAssignmentCreatedPayload,
  type LeagueResultPayload,
  type StreakFreezeUsedPayload,
} from '../../events/events';
import { NotificationsService } from './notifications.service';

/** Ngày dạng 25/10 theo giờ Việt Nam ('vi-VN' của Node in "25-10", nên dùng khuôn en-GB). */
const shortDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);

/** Biến sự kiện học tập thành thông báo — mỗi module chỉ phát sự kiện, câu chữ thông báo soạn ở đây. */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(AppEvent.AchievementUnlocked, { async: true })
  async onAchievementUnlocked(p: AchievementUnlockedPayload): Promise<void> {
    await this.safely('onAchievementUnlocked', () =>
      this.notifications.create({
        userId: p.userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        achievementId: p.achievementId,
        href: '/achievements',
        pushTitle: 'Mở khoá huy hiệu mới',
      }),
    );
  }

  @OnEvent(AppEvent.ClassAssignmentCreated, { async: true })
  async onClassAssignment(p: ClassAssignmentCreatedPayload): Promise<void> {
    const due = p.dueAt ? ` — hạn ${shortDate(p.dueAt)}` : '';
    const message = `${p.teacherName} giao bài mới ở lớp “${p.className}”: ${p.title}${due}`;
    await Promise.all(
      p.memberIds.map((userId) =>
        this.safely('onClassAssignment', () =>
          this.notifications.create({
            userId,
            type: NotificationType.CLASS_ASSIGNMENT,
            message,
            href: p.href,
            pushTitle: `Bài tập mới · ${p.className}`,
          }),
        ),
      ),
    );
  }

  @OnEvent(AppEvent.LeagueResult, { async: true })
  async onLeagueResult(p: LeagueResultPayload): Promise<void> {
    const place = `Tuần qua bạn đứng hạng ${p.rank}/${p.groupSize} bảng ${p.tierName} (${p.points} lượt ôn)`;
    const message =
      p.movement === 'up'
        ? `${place} — lên bảng ${p.nextTierName}!`
        : p.movement === 'down'
          ? `${place} — xuống bảng ${p.nextTierName}. Tuần này lấy lại nhé!`
          : `${place}. Tuần mới đã bắt đầu, ôn đều để lên bảng.`;
    await this.safely('onLeagueResult', () =>
      this.notifications.create({
        userId: p.userId,
        type: NotificationType.LEAGUE_RESULT,
        message,
        href: '/learn#giai-dau',
        pushTitle:
          p.movement === 'up'
            ? 'Bạn đã lên bảng mới!'
            : 'Kết quả giải đấu tuần',
      }),
    );
  }

  @OnEvent(AppEvent.StreakFreezeUsed, { async: true })
  async onStreakFreezeUsed(p: StreakFreezeUsedPayload): Promise<void> {
    await this.safely('onStreakFreezeUsed', () =>
      this.notifications.create({
        userId: p.userId,
        type: NotificationType.STREAK_SAVED,
        message: `Hôm qua bạn nghỉ, 1 lá chắn đã giữ chuỗi ${p.currentStreak} ngày. Còn ${p.freezeLeft} lá chắn — xong cả 3 nhiệm vụ ngày để nhận thêm.`,
        href: '/learn',
        pushTitle: 'Lá chắn đã giữ chuỗi ngày',
      }),
    );
  }

  /** Thông báo là việc phụ — lỗi chỉ ghi log, không làm hỏng luồng đã phát sự kiện. */
  private async safely(name: string, run: () => Promise<unknown>) {
    try {
      await run();
    } catch (err) {
      this.logger.error(`${name}: ${(err as Error).message}`);
    }
  }
}
