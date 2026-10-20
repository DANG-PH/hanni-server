import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../../database/entities';
import { NotificationType } from '../../database/enums';
import { PushService } from '../push/push.service';
import type { NotificationQueryDto } from './dto/notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

/** Quan hệ cần nạp để hiện 1 thông báo (ai, video nào, bình luận nào, huy hiệu nào). */
const RELATIONS = {
  actor: true,
  video: true,
  comment: true,
  achievement: true,
} as const;

/** Thông báo gửi cho client — chỉ những trường cần hiện (không lộ email… của người gây ra). */
function notificationView(n: Notification) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    actorId: n.actorId,
    videoId: n.videoId,
    commentId: n.commentId,
    achievementId: n.achievementId,
    readAt: n.readAt,
    createdAt: n.createdAt,
    actor: n.actor
      ? {
          id: n.actor.id,
          displayName: n.actor.displayName,
          avatarUrl: n.actor.avatarUrl,
        }
      : null,
    video: n.video ? { id: n.video.id, title: n.video.title } : null,
    comment: n.comment
      ? { id: n.comment.id, content: n.comment.content }
      : null,
    achievement: n.achievement
      ? {
          code: n.achievement.code,
          nameVi: n.achievement.nameVi,
          descriptionVi: n.achievement.descriptionVi,
        }
      : null,
  };
}

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  videoId?: string | null;
  commentId?: string | null;
  achievementId?: string | null;
}

/** Nội dung push cho từng loại thông báo. `actor` là tên người gây ra (đã
 * lọc trường hợp tự tác động lên mình ở `create()`). */
function pushTextFor(
  type: NotificationType,
  actor: string,
): { title: string; body: string } {
  switch (type) {
    case NotificationType.COMMENT_REPLY:
      return {
        title: 'Có người trả lời bạn',
        body: `${actor} đã trả lời bình luận của bạn.`,
      };
    case NotificationType.NEW_FOLLOWER:
      return {
        title: 'Bạn có người theo dõi mới',
        body: `${actor} vừa theo dõi bạn.`,
      };
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return {
        title: 'Mở khoá huy hiệu mới',
        body: 'Bạn vừa đạt một huy hiệu — xem ngay nhé!',
      };
    default:
      return { title: 'Hanni', body: 'Bạn có thông báo mới.' };
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
    private readonly push: PushService,
  ) {}

  /** Tạo thông báo + đẩy realtime + GỬI PUSH. Bỏ qua nếu người gây ra chính
   * là người nhận.
   *
   * Push ở đây là phần từng THIẾU HẲN: trước 2026-09-22 `PushService` chỉ
   * được `ReminderService` dùng (nhắc học theo lịch), nên mọi thông báo
   * tương tác chỉ tới được người đang MỞ SẴN app qua WebSocket — đóng app là
   * không biết gì, kể cả có người trả lời bình luận hay theo dõi mình. */
  async create(input: CreateNotificationInput) {
    if (input.actorId && input.actorId === input.userId) return null;
    const { identifiers } = await this.notifications.insert({
      userId: input.userId,
      type: input.type,
      actorId: input.actorId ?? null,
      videoId: input.videoId ?? null,
      commentId: input.commentId ?? null,
      achievementId: input.achievementId ?? null,
    });
    const notification = notificationView(
      await this.notifications.findOneOrFail({
        where: { id: identifiers[0].id as string },
        relations: RELATIONS,
      }),
    );
    this.gateway.emitToUser(input.userId, 'notification:new', notification);

    // Không await: push chậm/lỗi không được làm chậm luồng tạo thông báo.
    const { title, body } = pushTextFor(
      notification.type,
      notification.actor?.displayName ?? 'Ai đó',
    );
    void this.push
      .sendToUser(input.userId, title, body)
      .catch((err: Error) =>
        this.logger.warn(`Không gửi được push: ${err.message}`),
      );
    return notification;
  }

  async list(userId: string, q: NotificationQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const [items, total, unreadCount] = await Promise.all([
      this.notifications.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        relations: RELATIONS,
      }),
      this.notifications.countBy({ userId }),
      this.notifications.countBy({ userId, readAt: IsNull() }),
    ]);
    return {
      items: items.map(notificationView),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      unreadCount,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.notifications.countBy({
      userId,
      readAt: IsNull(),
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.notifications.update(
      { id, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { ok: true };
  }
}
