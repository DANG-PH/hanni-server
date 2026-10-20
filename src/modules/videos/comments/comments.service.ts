import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Video, VideoComment } from '../../../database/entities';
import { AppEvent, type CommentCreatedPayload } from '../../../events/events';
import type { CommentQueryDto, CreateCommentDto } from './comments.dto';

/** 1 bình luận gửi cho client: nội dung + người viết (tên, ảnh — không lộ gì khác). */
function commentView(c: VideoComment) {
  return {
    id: c.id,
    videoId: c.videoId,
    userId: c.userId,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: {
      id: c.user.id,
      displayName: c.user.displayName,
      avatarUrl: c.user.avatarUrl,
    },
  };
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(VideoComment)
    private readonly comments: Repository<VideoComment>,
    private readonly events: EventEmitter2,
  ) {}

  async list(videoId: string, q: CommentQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const [items, total] = await Promise.all([
      // Bình luận gốc mới nhất trước (trả lời sắp theo thời gian ở dưới — sắp theo cột của
      // quan hệ 1-nhiều ngay trong truy vấn phân trang sẽ làm lệch trang).
      this.comments.find({
        where: { videoId, parentId: IsNull() },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        relations: { user: true, replies: { user: true } },
      }),
      this.comments.countBy({ videoId, parentId: IsNull() }),
    ]);
    return {
      items: items.map((c) => ({
        ...commentView(c),
        replies: c.replies
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(commentView),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async create(userId: string, videoId: string, dto: CreateCommentDto) {
    if (!(await this.videos.existsBy({ id: videoId })))
      throw new NotFoundException('Không tìm thấy video');

    // Chỉ trả lời 1 cấp: nếu trả lời một bình luận vốn đã là trả lời, gắn
    // luôn vào bình luận gốc của nó để tránh cây lồng sâu trên giao diện.
    let parentId: string | null = null;
    if (dto.parentId) {
      const parent = await this.comments.findOne({
        where: { id: dto.parentId },
        select: { id: true, videoId: true, parentId: true, userId: true },
      });
      if (!parent || parent.videoId !== videoId) {
        throw new NotFoundException('Không tìm thấy bình luận để trả lời');
      }
      parentId = parent.parentId ?? parent.id;
    }

    const { identifiers } = await this.comments.insert({
      videoId,
      userId,
      content: dto.content.trim(),
      parentId,
    });
    const comment = commentView(
      await this.comments.findOneOrFail({
        where: { id: identifiers[0].id as string },
        relations: { user: true },
      }),
    );

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
    const comment = await this.comments.findOne({
      where: { id: commentId },
      select: { id: true, userId: true, videoId: true },
    });
    if (!comment || comment.videoId !== videoId) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }
    if (comment.userId !== userId && role !== 'admin') {
      throw new ForbiddenException('Chỉ người viết bình luận mới xoá được');
    }
    await this.comments.delete(commentId);
    return { ok: true };
  }
}
