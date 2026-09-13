import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent, type UserFollowedPayload } from '../../../events/events';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async follow(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy người dùng');

    // upsert: bấm theo dõi nhiều lần vẫn idempotent.
    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId: userId, followingId: targetId },
      },
      create: { followerId: userId, followingId: targetId },
      update: {},
    });

    const payload: UserFollowedPayload = {
      followerId: userId,
      followingId: targetId,
    };
    this.events.emit(AppEvent.UserFollowed, payload);

    return this.status(userId, targetId);
  }

  async unfollow(userId: string, targetId: string) {
    await this.prisma.follow
      .delete({
        where: {
          followerId_followingId: { followerId: userId, followingId: targetId },
        },
      })
      .catch(() => undefined); // đã bỏ theo dõi rồi cũng coi như thành công
    return this.status(userId, targetId);
  }

  private async status(userId: string, targetId: string) {
    const [followerCount, following] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: targetId } }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: userId, followingId: targetId },
        },
      }),
    ]);
    return { followerCount, following: Boolean(following) };
  }
}
