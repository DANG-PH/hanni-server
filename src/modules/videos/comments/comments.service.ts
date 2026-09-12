import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent, type CommentCreatedPayload } from '../../../events/events';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { CommentQueryDto, CreateCommentDto } from './comments.dto';

const AUTHOR_SELECT = { id: true, displayName: true, avatarUrl: true };

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async list(videoId: string, q: CommentQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.videoComment.findMany({
        where: { videoId, parentId: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: AUTHOR_SELECT },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: AUTHOR_SELECT } },
          },
        },
      }),
      this.prisma.videoComment.count({ where: { videoId, parentId: null } }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async create(userId: string, videoId: string, dto: CreateCommentDto) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, createdById: true },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');

    // Chỉ trả lời 1 cấp: nếu trả lời một bình luận vốn đã là trả lời, gắn
    // luôn vào bình luận gốc của nó để tránh cây lồng sâu trên giao diện.
    let parentId: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.videoComment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, videoId: true, parentId: true, userId: true },
      });
      if (!parent || parent.videoId !== videoId) {
        throw new NotFoundException('Không tìm thấy bình luận để trả lời');
      }
      parentId = parent.parentId ?? parent.id;
    }

    const comment = await this.prisma.videoComment.create({
      data: { videoId, userId, content: dto.content.trim(), parentId },
      include: { user: { select: AUTHOR_SELECT } },
    });

    const payload: CommentCreatedPayload = {
      commentId: comment.id,
      videoId,
      authorId: userId,
      parentId,
    };
    this.events.emit(AppEvent.CommentCreated, payload);

    return comment;
  }

  async remove(
    userId: string,
    videoId: string,
    commentId: string,
    role: string,
  ) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
      select: { userId: true, videoId: true },
    });
    if (!comment || comment.videoId !== videoId) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }
    if (comment.userId !== userId && role !== 'admin') {
      throw new ForbiddenException('Chỉ người viết bình luận mới xoá được');
    }
    await this.prisma.videoComment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
