import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoLike } from '../../../database/entities';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(VideoLike) private readonly likes: Repository<VideoLike>,
  ) {}

  async like(userId: string, videoId: string) {
    if (!(await this.videos.existsBy({ id: videoId })))
      throw new NotFoundException('Không tìm thấy video');

    // ON CONFLICT DO NOTHING: bấm thích nhiều lần vẫn idempotent.
    await this.likes
      .createQueryBuilder()
      .insert()
      .values({ userId, videoId })
      .orIgnore()
      .execute();

    return this.status(userId, videoId);
  }

  async unlike(userId: string, videoId: string) {
    // Đã bỏ thích rồi thì không xoá được dòng nào — vẫn coi như thành công.
    await this.likes.delete({ userId, videoId });
    return this.status(userId, videoId);
  }

  private async status(userId: string, videoId: string) {
    const [likeCount, liked] = await Promise.all([
      this.likes.countBy({ videoId }),
      this.likes.existsBy({ userId, videoId }),
    ]);
    return { likeCount, liked };
  }
}
