import { Injectable } from '@nestjs/common';
import type { UserSettings } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { UpdateSettingsDto } from './dto/users.dto';

@Injectable()
export class UserSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<UserSettings> {
    // upsert phòng khi user cũ chưa có row settings
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async update(userId: string, dto: UpdateSettingsDto): Promise<UserSettings> {
    const data = { ...dto };
    if (dto.srsScheduler && !['sm2', 'fsrs'].includes(dto.srsScheduler)) {
      delete data.srsScheduler;
    }
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
