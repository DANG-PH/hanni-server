import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PushService } from '../push/push.service';
import type { NotificationQueryDto } from './dto/notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

const ACTOR_SELECT = { id: true, displayName: true, avatarUrl: true };
const INCLUDE = {
  actor: { select: ACTOR_SELECT },
  video: { select: { id: true, title: true } },
  comment: { select: { id: true, content: true } },
  achievement: { select: { code: true, nameVi: true, descriptionVi: true } },
} as const;

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
    case NotificationType.VIDEO_COMMENT:
      return {
        title: 'Bình luận mới',
        body: `${actor} đã bình luận vào video bạn thêm.`,
      };
    case NotificationType.VIDEO_LIKE:
      return {
        title: 'Video của bạn được thích',
        body: `${actor} đã thích video bạn thêm.`,
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
    private readonly prisma: PrismaService,
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
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        videoId: input.videoId ?? null,
        commentId: input.commentId ?? null,
        achievementId: input.achievementId ?? null,
      },
      include: INCLUDE,
    });
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
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: INCLUDE,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      unreadCount,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
