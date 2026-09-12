import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import {
  AppEvent,
  type CommentCreatedPayload,
  type VideoLikedPayload,
} from '../../events/events';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent(AppEvent.CommentCreated, { async: true })
  async onCommentCreated(p: CommentCreatedPayload): Promise<void> {
    try {
      if (p.parentId) {
        const parent = await this.prisma.videoComment.findUnique({
          where: { id: p.parentId },
          select: { userId: true },
        });
        if (parent) {
          await this.notifications.create({
            userId: parent.userId,
            type: NotificationType.COMMENT_REPLY,
            actorId: p.authorId,
            videoId: p.videoId,
            commentId: p.commentId,
          });
        }
        return;
      }
      // Bình luận gốc (không phải trả lời) → báo cho chủ video đã thêm nó.
      const video = await this.prisma.video.findUnique({
        where: { id: p.videoId },
        select: { createdById: true },
      });
      if (video?.createdById) {
        await this.notifications.create({
          userId: video.createdById,
          type: NotificationType.VIDEO_COMMENT,
          actorId: p.authorId,
          videoId: p.videoId,
          commentId: p.commentId,
        });
      }
    } catch (err) {
      this.logger.error(`onCommentCreated: ${(err as Error).message}`);
    }
  }

  @OnEvent(AppEvent.VideoLiked, { async: true })
  async onVideoLiked(p: VideoLikedPayload): Promise<void> {
    try {
      const video = await this.prisma.video.findUnique({
        where: { id: p.videoId },
        select: { createdById: true },
      });
      if (video?.createdById) {
        await this.notifications.create({
          userId: video.createdById,
          type: NotificationType.VIDEO_LIKE,
          actorId: p.likerId,
          videoId: p.videoId,
        });
      }
    } catch (err) {
      this.logger.error(`onVideoLiked: ${(err as Error).message}`);
    }
  }
}
