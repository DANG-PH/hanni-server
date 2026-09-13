import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const USER_SELECT = { id: true, displayName: true, avatarUrl: true } as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /** Chuẩn hoá thứ tự cặp user (userAId luôn nhỏ hơn) để 1 cặp chỉ có ĐÚNG
   * 1 hội thoại, không phụ thuộc ai nhắn trước. */
  private pairIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  /** Lấy hội thoại với 1 user, tự tạo nếu chưa có — dùng khi bấm "Nhắn tin"
   * từ hồ sơ công khai. */
  async getOrCreateWith(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException('Không thể tự nhắn tin cho chính mình');
    }
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!other) throw new NotFoundException('Không tìm thấy người dùng');

    const [userAId, userBId] = this.pairIds(userId, otherUserId);
    const conversation = await this.prisma.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
      include: {
        userA: { select: USER_SELECT },
        userB: { select: USER_SELECT },
      },
    });
    return this.toSummary(conversation, userId);
  }

  /** Danh sách hội thoại — kèm tin nhắn cuối + số chưa đọc, mới nhất trước. */
  async listConversations(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: USER_SELECT },
        userB: { select: USER_SELECT },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const unreadCounts = await this.prisma.directMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversation: { OR: [{ userAId: userId }, { userBId: userId }] },
        senderId: { not: userId },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.conversationId, u._count._all]),
    );

    return rows.map((c) => ({
      ...this.toSummary(c, userId),
      lastMessage: c.messages[0]
        ? {
            content: c.messages[0].content,
            createdAt: c.messages[0].createdAt,
            mine: c.messages[0].senderId === userId,
          }
        : null,
      unreadCount: unreadMap.get(c.id) ?? 0,
    }));
  }

  async getMessages(userId: string, conversationId: string, page = 1) {
    await this.requireMember(userId, conversationId);
    const pageSize = 30;
    const [items, total] = await Promise.all([
      this.prisma.directMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.directMessage.count({ where: { conversationId } }),
    ]);
    return {
      items: items.reverse(),
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.requireMember(userId, conversationId);
    const otherUserId =
      conversation.userAId === userId
        ? conversation.userBId
        : conversation.userAId;

    const [message] = await this.prisma.$transaction([
      this.prisma.directMessage.create({
        data: { conversationId, senderId: userId, content },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    this.gateway.emitToUser(otherUserId, 'message:new', {
      conversationId,
      message,
    });
    return message;
  }

  async markRead(
    userId: string,
    conversationId: string,
  ): Promise<{ ok: true }> {
    await this.requireMember(userId, conversationId);
    await this.prisma.directMessage.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.directMessage.count({
      where: {
        conversation: { OR: [{ userAId: userId }, { userBId: userId }] },
        senderId: { not: userId },
        readAt: null,
      },
    });
    return { count };
  }

  private async requireMember(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException('Bạn không thuộc hội thoại này');
    }
    return conversation;
  }

  private toSummary(
    c: {
      id: string;
      userAId: string;
      userBId: string;
      updatedAt: Date;
      userA: { id: string; displayName: string; avatarUrl: string | null };
      userB: { id: string; displayName: string; avatarUrl: string | null };
    },
    viewerId: string,
  ) {
    const other = c.userAId === viewerId ? c.userB : c.userA;
    return { id: c.id, updatedAt: c.updatedAt, otherUser: other };
  }
}
