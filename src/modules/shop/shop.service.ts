import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AVATAR_FRAMES } from './frame-catalog';

export interface FrameCatalogItem {
  key: string;
  name: string;
  price: number;
  colors: [string, string];
  owned: boolean;
  equipped: boolean;
}

/**
 * Cửa hàng khung avatar — thuần trang trí, mua đứt bằng xu (xem
 * `frame-catalog.ts` cho lý do không dùng cơ chế rương/random reward).
 */
@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async getCatalog(userId: string): Promise<{
    frames: FrameCatalogItem[];
    balance: number;
  }> {
    const [owned, settings, balance] = await Promise.all([
      this.prisma.userFrame.findMany({
        where: { userId },
        select: { frameKey: true },
      }),
      this.prisma.userSettings.findUnique({
        where: { userId },
        select: { equippedFrame: true },
      }),
      this.wallet.getBalance(userId),
    ]);
    const ownedKeys = new Set(owned.map((f) => f.frameKey));
    const frames = AVATAR_FRAMES.map((frame) => ({
      ...frame,
      owned: ownedKeys.has(frame.key),
      equipped: settings?.equippedFrame === frame.key,
    }));
    return { frames, balance };
  }

  async buy(userId: string, frameKey: string): Promise<FrameCatalogItem> {
    const frame = AVATAR_FRAMES.find((f) => f.key === frameKey);
    if (!frame) throw new BadRequestException('Không tìm thấy khung này');

    const already = await this.prisma.userFrame.findUnique({
      where: { userId_frameKey: { userId, frameKey } },
    });
    if (already) throw new BadRequestException('Bạn đã sở hữu khung này rồi');

    await this.wallet.debit(userId, frame.price, `buy_frame:${frameKey}`);
    await this.prisma.userFrame.create({ data: { userId, frameKey } });
    return { ...frame, owned: true, equipped: false };
  }

  /** `frameKey: null` = bỏ khung, dùng avatar trơn. */
  async equip(userId: string, frameKey: string | null): Promise<void> {
    if (frameKey !== null) {
      const owned = await this.prisma.userFrame.findUnique({
        where: { userId_frameKey: { userId, frameKey } },
      });
      if (!owned) throw new BadRequestException('Bạn chưa mua khung này');
    }
    await this.prisma.userSettings.update({
      where: { userId },
      data: { equippedFrame: frameKey },
    });
  }
}
