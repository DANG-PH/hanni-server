import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoComment } from '../../database/entities';
import { NotificationType } from '../../database/enums';
import {
  AppEvent,
  type AchievementUnlockedPayload,
  type CommentCreatedPayload,
  type UserFollowedPayload,
} from '../../events/events';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    @InjectRepository(VideoComment)
    private readonly comments: Repository<VideoComment>,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent(AppEvent.CommentCreated, { async: true })
  async onCommentCreated(p: CommentCreatedPayload): Promise<void> {
    try {
      if (p.parentId) {
        const parent = await this.comments.findOne({
          where: { id: p.parentId },
          select: { id: true, userId: true },
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
      }
    } catch (err) {
      this.logger.error(`onCommentCreated: ${(err as Error).message}`);
    }
  }

  @OnEvent(AppEvent.UserFollowed, { async: true })
  async onUserFollowed(p: UserFollowedPayload): Promise<void> {
    try {
      await this.notifications.create({
        userId: p.followingId,
        type: NotificationType.NEW_FOLLOWER,
        actorId: p.followerId,
      });
    } catch (err) {
      this.logger.error(`onUserFollowed: ${(err as Error).message}`);
    }
  }

  @OnEvent(AppEvent.AchievementUnlocked, { async: true })
  async onAchievementUnlocked(p: AchievementUnlockedPayload): Promise<void> {
    try {
      // Không có actorId — chính người dùng tự đạt được, không phải do
      // người khác tác động, nên NotificationsService.create() không bỏ
      // qua thông báo này (điều kiện bỏ qua chỉ áp dụng khi actorId trùng
      // userId nhận).
      await this.notifications.create({
        userId: p.userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        achievementId: p.achievementId,
      });
    } catch (err) {
      this.logger.error(`onAchievementUnlocked: ${(err as Error).message}`);
    }
  }
}
