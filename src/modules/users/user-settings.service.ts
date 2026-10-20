import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from '../../database/entities';
import { findOrCreate } from '../../database/repository.util';
import type { UpdateSettingsDto } from './dto/users.dto';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly settings: Repository<UserSettings>,
  ) {}

  async get(userId: string): Promise<UserSettings> {
    // Tạo dòng mặc định phòng khi user cũ chưa có.
    return findOrCreate(this.settings, { userId });
  }

  async update(userId: string, dto: UpdateSettingsDto): Promise<UserSettings> {
    const data = { ...dto };
    if (dto.srsScheduler && !['sm2', 'fsrs'].includes(dto.srsScheduler)) {
      delete data.srsScheduler;
    }
    await this.settings.upsert({ userId, ...data }, ['userId']);
    return this.settings.findOneByOrFail({ userId });
  }
}
