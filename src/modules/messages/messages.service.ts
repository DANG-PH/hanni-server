import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { pinyin } from 'pinyin-pro';
import {
  DataSource,
  In,
  IsNull,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  Conversation,
  DirectMessage,
  Follow,
  User,
} from '../../database/entities';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushService } from '../push/push.service';
import { translateLinesToVi, translateSimple } from '../videos/translate.util';

/** Người trong hội thoại: chỉ tên + ảnh (không lộ email…). */
const person = (u: User) => ({
  id: u.id,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
});

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(DirectMessage)
    private readonly messages: Repository<DirectMessage>,
    private readonly gateway: NotificationsGateway,
    private readonly push: PushService,
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
    if (!(await this.users.existsBy({ id: otherUserId })))
      throw new NotFoundException('Không tìm thấy người dùng');

    const [userAId, userBId] = this.pairIds(userId, otherUserId);
    const existing = await this.conversations.findOne({
      where: { userAId, userBId },
      relations: { userA: true, userB: true },
    });
    if (existing) return this.toSummary(existing, userId);

    // Theo dõi nhau 1 trong 2 chiều là đủ "kết nối".
    const connected = await this.follows.existsBy([
      { followerId: userId, followingId: otherUserId },
      { followerId: otherUserId, followingId: userId },
    ]);
    if (!connected) {
      throw new ForbiddenException(
        'Cần theo dõi nhau trước khi bắt đầu nhắn tin',
      );
    }

    const { identifiers } = await this.conversations.insert({
      userAId,
      userBId,
    });
    const conversation = await this.conversations.findOneOrFail({
      where: { id: identifiers[0].id as string },
      relations: { userA: true, userB: true },
    });
    return this.toSummary(conversation, userId);
  }

  /** Danh sách hội thoại — kèm tin nhắn cuối + số chưa đọc, mới nhất trước. */
  async listConversations(userId: string) {
    const rows = await this.conversations.find({
      where: [{ userAId: userId }, { userBId: userId }],
      order: { updatedAt: 'DESC' },
      relations: { userA: true, userB: true },
    });
    const ids = rows.map((c) => c.id);
    const [lastMessages, unreadCounts] = ids.length
      ? await Promise.all([
          // Tin nhắn cuối của mỗi hội thoại (DISTINCT ON: 1 dòng mới nhất mỗi hội thoại).
          this.messages
            .createQueryBuilder('m')
            .distinctOn(['m.conversationId'])
            .where({ conversationId: In(ids) })
            .orderBy('m.conversationId')
            .addOrderBy('m.createdAt', 'DESC')
            .getMany(),
          // Số tin CHƯA ĐỌC người kia gửi, theo từng hội thoại.
          this.messages
            .createQueryBuilder('m')
            .select('m.conversationId', 'conversationId')
            .addSelect('COUNT(*)::int', 'count')
            .where({
              conversationId: In(ids),
              senderId: Not(userId),
              readAt: IsNull(),
            })
            .groupBy('m.conversationId')
            .getRawMany<{ conversationId: string; count: number }>(),
        ])
      : [[], []];
    const lastBy = new Map(lastMessages.map((m) => [m.conversationId, m]));
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.conversationId, u.count]),
    );

    return rows.map((c) => {
      const last = lastBy.get(c.id);
      return {
        ...this.toSummary(c, userId),
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt,
              mine: last.senderId === userId,
            }
          : null,
        unreadCount: unreadMap.get(c.id) ?? 0,
      };
    });
  }

  async getMessages(userId: string, conversationId: string, page = 1) {
    await this.requireMember(userId, conversationId);
    const pageSize = 30;
    const [items, total] = await Promise.all([
      this.messages.find({
        where: { conversationId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.messages.countBy({ conversationId }),
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

    // Lưu tin + đẩy hội thoại lên đầu danh sách, trong 1 transaction.
    const message = await this.dataSource.transaction(async (db) => {
      const { identifiers } = await db.insert(DirectMessage, {
        conversationId,
        senderId: userId,
        content,
      });
      await db.update(Conversation, conversationId, { updatedAt: new Date() });
      return db.findOneByOrFail(DirectMessage, {
        id: identifiers[0].id as string,
      });
    });

    this.gateway.emitToUser(otherUserId, 'message:new', {
      conversationId,
      message,
    });

    // Push cho người nhận — phần từng THIẾU HẲN: trước 2026-09-22 tin nhắn
    // chỉ đẩy qua WebSocket nên người nhận phải đang MỞ SẴN app mới biết,
    // đóng app là im lặng hoàn toàn. Không await để không làm chậm việc gửi.
    void this.sendMessagePush(userId, otherUserId, content);
    return message;
  }

  /** Tên người gửi + trích nội dung cho thông báo đẩy. Tin nhắn có thể dài
   * hoặc là chữ Hán — cắt ngắn để thông báo không tràn. */
  private async sendMessagePush(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<void> {
    try {
      const sender = await this.users.findOne({
        where: { id: senderId },
        select: { id: true, displayName: true },
      });
      const preview =
        content.length > 80 ? `${content.slice(0, 80)}…` : content;
      await this.push.sendToUser(
        receiverId,
        `Tin nhắn từ ${sender?.displayName ?? 'một người bạn'}`,
        preview,
      );
    } catch (err) {
      this.logger.warn(
        `Không gửi được push tin nhắn: ${(err as Error).message}`,
      );
    }
  }

  async markRead(
    userId: string,
    conversationId: string,
  ): Promise<{ ok: true }> {
    const conversation = await this.requireMember(userId, conversationId);
    const { affected } = await this.messages.update(
      { conversationId, senderId: Not(userId), readAt: IsNull() },
      { readAt: new Date() },
    );
    // Chỉ báo cho người gửi khi thực sự có tin MỚI vừa được đánh dấu đã
    // xem — tránh bắn sự kiện thừa mỗi lần mở lại hội thoại cũ.
    if (affected) {
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

  /** "Dịch trước khi gửi" — dịch nội dung ĐANG SOẠN sang ngôn ngữ đích, để
   * FE điền lại vào ô nhập cho người dùng xem/sửa trước khi thật sự gửi
   * (khác `translateText()` ở trên, dịch 1 tin ĐÃ gửi để đọc). Không lưu
   * lại DB — chỉ là bước soạn thảo, không phải nội dung tin nhắn thật. */
  async translateForCompose(
    text: string,
    targetLang: 'zh' | 'vi',
  ): Promise<{ translated: string }> {
    const [sl, tl] = targetLang === 'zh' ? ['vi', 'zh-CN'] : ['zh-CN', 'vi'];
    // callMyMemory() ném lỗi khi hết hạn mức ngày (khác trả về null như các
    // lỗi khác) — bắt lại để trả 400 gọn gàng thay vì lộ 500 khi bộ dịch dự
    // phòng cũng hết lượt (đã từng xảy ra thật khi Google bị chặn IP VÀ
    // MyMemory hết hạn mức cùng lúc).
    let translated: string | null = null;
    try {
      translated = await translateSimple(text, sl, tl);
    } catch (err) {
      this.logger.warn(`translateForCompose lỗi: ${(err as Error).message}`);
      translated = null;
    }
    if (!translated) {
      throw new BadRequestException('Chưa dịch được, thử lại sau nhé');
    }
    return { translated };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    // Tin người khác gửi cho mình, chưa đọc, ở mọi hội thoại mình tham gia.
    const unread = { senderId: Not(userId), readAt: IsNull() };
    const count = await this.messages.count({
      where: [
        { ...unread, conversation: { userAId: userId } },
        { ...unread, conversation: { userBId: userId } },
      ],
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
      this.conversations.count(),
      this.messages.count(),
      this.conversations.countBy({ createdAt: MoreThanOrEqual(since7d) }),
      this.messages.countBy({ createdAt: MoreThanOrEqual(since7d) }),
      // Hội thoại có ít nhất 2 người thật sự nhắn qua lại.
      this.dataSource.query<{ count: string }[]>(`
        SELECT COUNT(*) AS count FROM (
          SELECT "conversationId" FROM "DirectMessage"
          GROUP BY "conversationId"
          HAVING COUNT(DISTINCT "senderId") >= 2
        ) t
      `),
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
    const conversation = await this.conversations.findOneBy({
      id: conversationId,
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException('Bạn không thuộc hội thoại này');
    }
    return conversation;
  }

  private toSummary(c: Conversation, viewerId: string) {
    const other = c.userAId === viewerId ? c.userB : c.userA;
    return { id: c.id, updatedAt: c.updatedAt, otherUser: person(other) };
  }
}
