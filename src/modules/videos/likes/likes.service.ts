import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent, type VideoLikedPayload } from '../../../events/events';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async like(userId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');

    // upsert: bấm thích nhiều lần vẫn idempotent, không lỗi unique constraint.
    await this.prisma.videoLike.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: { userId, videoId },
      update: {},
    });

    const payload: VideoLikedPayload = { videoId, likerId: userId };
    this.events.emit(AppEvent.VideoLiked, payload);

    return this.status(userId, videoId);
  }

  async unlike(userId: string, videoId: string) {
    await this.prisma.videoLike
      .delete({ where: { userId_videoId: { userId, videoId } } })
      .catch(() => undefined); // đã bỏ thích rồi cũng coi như thành công
    return this.status(userId, videoId);
  }

  private async status(userId: string, videoId: string) {
    const [likeCount, liked] = await Promise.all([
      this.prisma.videoLike.count({ where: { videoId } }),
      this.prisma.videoLike.findUnique({
        where: { userId_videoId: { userId, videoId } },
      }),
    ]);
    return { likeCount, liked: Boolean(liked) };
  }
}
