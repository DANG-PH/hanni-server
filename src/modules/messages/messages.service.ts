import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { pinyin } from 'pinyin-pro';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { translateLinesToVi } from '../videos/translate.util';

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
   * từ hồ sơ công khai. Hội thoại MỚI (chưa từng nhắn) yêu cầu đã "kết nối"
   * (theo dõi nhau, 1 trong 2 chiều) — tránh cảm giác nhắn cho người lạ
   * hoàn toàn không quen biết gì; hội thoại ĐÃ CÓ sẵn thì luôn mở lại được
   * dù sau đó có bỏ theo dõi nhau. */
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
    const existing = await this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      include: {
        userA: { select: USER_SELECT },
        userB: { select: USER_SELECT },
      },
    });
    if (existing) return this.toSummary(existing, userId);

    const connected = await this.prisma.follow.findFirst({
      where: {
        OR: [
          { followerId: userId, followingId: otherUserId },
          { followerId: otherUserId, followingId: userId },
        ],
      },
    });
    if (!connected) {
      throw new ForbiddenException(
        'Cần theo dõi nhau trước khi bắt đầu nhắn tin',
      );
    }

    const conversation = await this.prisma.conversation.create({
      data: { userAId, userBId },
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
      total,
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
    const conversation = await this.requireMember(userId, conversationId);
    const { count } = await this.prisma.directMessage.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    // Chỉ báo cho người gửi khi thực sự có tin MỚI vừa được đánh dấu đã
    // xem — tránh bắn sự kiện thừa mỗi lần mở lại hội thoại cũ.
    if (count > 0) {
      const otherUserId =
        conversation.userAId === userId
          ? conversation.userBId
          : conversation.userAId;
      this.gateway.emitToUser(otherUserId, 'message:read', {
        conversationId,
      });
    }
    return { ok: true };
  }

  /** Dịch nhanh 1 tin nhắn (pinyin + nghĩa tiếng Việt) để luyện đọc ngay
   * trong khung chat — tái dùng bộ dịch máy free đã có cho video. Không lưu
   * lại (khác video: 1 hội thoại chỉ 2 người xem, không đáng cache DB). */
  async translateText(
    text: string,
  ): Promise<{ pinyin: string; vi: string | null }> {
    const [vi] = await translateLinesToVi([text]);
    return {
      pinyin: pinyin(text, { toneType: 'symbol', nonZh: 'consecutive' }),
      vi,
    };
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

  /** Số liệu tổng quan để đánh giá mức độ dùng thật của tính năng nhắn tin
   * (không phải theo dõi hoạt động 1 user cụ thể) — tổng hội thoại, tổng
   * tin nhắn, hội thoại/tin nhắn 7 ngày qua, và số hội thoại CÓ ÍT NHẤT 2
   * tin nhắn qua lại thật sự (khác hội thoại chỉ tạo ra rồi bỏ đó, phản
   * ánh đúng hơn số cuộc trò chuyện thật). */
  async usageStats() {
    const since7d = new Date(Date.now() - 7 * 86_400_000);
    const [
      totalConversations,
      totalMessages,
      conversations7d,
      messages7d,
      conversationsWithReplies,
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.directMessage.count(),
      this.prisma.conversation.count({
        where: { createdAt: { gte: since7d } },
      }),
      this.prisma.directMessage.count({
        where: { createdAt: { gte: since7d } },
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM (
          SELECT "conversationId" FROM "DirectMessage"
          GROUP BY "conversationId"
          HAVING COUNT(DISTINCT "senderId") >= 2
        ) t
      `,
    ]);
    return {
      totalConversations,
      totalMessages,
      conversations7d,
      messages7d,
      conversationsWithReplies: Number(conversationsWithReplies[0]?.count ?? 0),
    };
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
