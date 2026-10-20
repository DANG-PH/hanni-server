import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow, User } from '../../../database/entities';
import { AppEvent, type UserFollowedPayload } from '../../../events/events';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    private readonly events: EventEmitter2,
  ) {}

  async follow(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }
    if (!(await this.users.existsBy({ id: targetId })))
      throw new NotFoundException('Không tìm thấy người dùng');

    // ON CONFLICT DO NOTHING: bấm theo dõi nhiều lần vẫn idempotent.
    await this.follows
      .createQueryBuilder()
      .insert()
      .values({ followerId: userId, followingId: targetId })
      .orIgnore()
      .execute();

    const payload: UserFollowedPayload = {
      followerId: userId,
      followingId: targetId,
    };
    this.events.emit(AppEvent.UserFollowed, payload);

    return this.status(userId, targetId);
  }

  async unfollow(userId: string, targetId: string) {
    // Đã bỏ theo dõi rồi thì không xoá được dòng nào — vẫn coi như thành công.
    await this.follows.delete({ followerId: userId, followingId: targetId });
    return this.status(userId, targetId);
  }

  private async status(userId: string, targetId: string) {
    const [followerCount, following] = await Promise.all([
      this.follows.countBy({ followingId: targetId }),
      this.follows.existsBy({ followerId: userId, followingId: targetId }),
    ]);
    return { followerCount, following };
  }
}
