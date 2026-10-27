import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../../database/entities';
import { NotificationType } from '../../database/enums';
import { PushService } from '../push/push.service';
import type { NotificationQueryDto } from './dto/notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

/** Thông báo gửi cho client — chỉ những trường cần hiện. */
function notificationView(n: Notification) {
  return {
    id: n.id,
    type: n.type,
    message: n.message,
    href: n.href,
    readAt: n.readAt,
    createdAt: n.createdAt,
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
  /** Loại mới: câu chữ + đường dẫn soạn sẵn. Huy hiệu thì lấy tên từ `achievementId`. */
  message?: string;
  href?: string;
  achievementId?: string;
  /** Tiêu đề push (thân push = `message`). */
  pushTitle: string;
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

  /** Lưu thông báo + đẩy realtime tới app đang mở (WebSocket) + gửi push tới máy đã bật thông báo. */
  async create(input: CreateNotificationInput) {
    const { identifiers } = await this.notifications.insert({
      userId: input.userId,
      type: input.type,
      message: input.message ?? null,
      href: input.href ?? null,
      achievementId: input.achievementId ?? null,
    });
    const notification = notificationView(
      await this.notifications.findOneOrFail({
        where: { id: identifiers[0].id as string },
        relations: { achievement: true },
      }),
    );
    this.gateway.emitToUser(input.userId, 'notification:new', notification);

    const body =
      notification.message ??
      (notification.achievement
        ? `Bạn vừa đạt huy hiệu “${notification.achievement.nameVi}”.`
        : 'Bạn có thông báo mới.');
    // Không await: push chậm/lỗi không được làm chậm luồng chính.
    void this.push
      .sendToUser(input.userId, input.pushTitle, body)
      .catch((err: Error) =>
        this.logger.warn(`Không gửi được push: ${err.message}`),
      );
    return notification;
  }

  async list(userId: string, q: NotificationQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = { userId };
    const [items, total, unreadCount] = await Promise.all([
      this.notifications.find({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        relations: { achievement: true },
      }),
      this.notifications.countBy(where),
      this.notifications.countBy({ ...where, readAt: IsNull() }),
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
