import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { isPremiumActive } from '../premium/premium-plans';
import { AVATAR_FRAMES } from './frame-catalog';

export interface FrameCatalogItem {
  key: string;
  name: string;
  colors: [string, string];
  owned: boolean;
  equipped: boolean;
}

/** Khung avatar Premium (xem `frame-catalog.ts`) — không còn bán bằng xu. */
@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(userId: string): Promise<{ frames: FrameCatalogItem[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        premiumUntil: true,
        settings: { select: { equippedFrame: true } },
      },
    });
    const premium = isPremiumActive(user.premiumUntil);
    return {
      frames: AVATAR_FRAMES.map((frame) => ({
        ...frame,
        owned: premium,
        equipped: user.settings?.equippedFrame === frame.key,
      })),
    };
  }

  /** `frameKey: null` = bỏ khung, dùng avatar trơn. */
  async equip(userId: string, frameKey: string | null): Promise<void> {
    if (frameKey !== null) {
      if (!AVATAR_FRAMES.some((f) => f.key === frameKey)) {
        throw new BadRequestException('Không tìm thấy khung này');
      }
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { premiumUntil: true },
      });
      if (!isPremiumActive(user.premiumUntil)) {
        throw new BadRequestException('Khung này chỉ dành cho Premium');
      }
    }
    await this.prisma.userSettings.update({
      where: { userId },
      data: { equippedFrame: frameKey },
    });
  }
}
