import { Injectable } from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { NotificationQueryDto } from './dto/notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

const ACTOR_SELECT = { id: true, displayName: true, avatarUrl: true };
const INCLUDE = {
  actor: { select: ACTOR_SELECT },
  video: { select: { id: true, title: true } },
  comment: { select: { id: true, content: true } },
} as const;

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  videoId?: string | null;
  commentId?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /** Tạo thông báo + đẩy realtime. Bỏ qua nếu người gây ra chính là người nhận. */
  async create(input: CreateNotificationInput) {
    if (input.actorId && input.actorId === input.userId) return null;
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        videoId: input.videoId ?? null,
        commentId: input.commentId ?? null,
      },
      include: INCLUDE,
    });
    this.gateway.emitToUser(input.userId, 'notification:new', notification);
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
