import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { isPremiumActive } from '../premium/premium-plans';
import { WalletService } from '../wallet/wallet.service';
import { AVATAR_FRAMES } from './frame-catalog';

export interface FrameCatalogItem {
  key: string;
  name: string;
  price: number;
  colors: [string, string];
  premiumOnly: boolean;
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
    const [owned, user, balance] = await Promise.all([
      this.prisma.userFrame.findMany({
        where: { userId },
        select: { frameKey: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          premiumUntil: true,
          settings: { select: { equippedFrame: true } },
        },
      }),
      this.wallet.getBalance(userId),
    ]);
    const ownedKeys = new Set(owned.map((f) => f.frameKey));
    const premium = isPremiumActive(user.premiumUntil);
    const frames = AVATAR_FRAMES.map((frame) => ({
      ...frame,
      premiumOnly: Boolean(frame.premiumOnly),
      owned: frame.premiumOnly ? premium : ownedKeys.has(frame.key),
      equipped: user.settings?.equippedFrame === frame.key,
    }));
    return { frames, balance };
  }

  async buy(userId: string, frameKey: string): Promise<FrameCatalogItem> {
    const frame = AVATAR_FRAMES.find((f) => f.key === frameKey);
    if (!frame) throw new BadRequestException('Không tìm thấy khung này');
    if (frame.premiumOnly) {
      throw new BadRequestException(
        'Khung này chỉ dành cho Premium, không mua được bằng xu',
      );
    }

    const already = await this.prisma.userFrame.findUnique({
      where: { userId_frameKey: { userId, frameKey } },
    });
    if (already) throw new BadRequestException('Bạn đã sở hữu khung này rồi');

    await this.wallet.debit(userId, frame.price, `buy_frame:${frameKey}`);
    await this.prisma.userFrame.create({ data: { userId, frameKey } });
    return { ...frame, premiumOnly: false, owned: true, equipped: false };
  }

  /** `frameKey: null` = bỏ khung, dùng avatar trơn. */
  async equip(userId: string, frameKey: string | null): Promise<void> {
    if (frameKey !== null) {
      const frame = AVATAR_FRAMES.find((f) => f.key === frameKey);
      if (!frame) throw new BadRequestException('Không tìm thấy khung này');
      if (frame.premiumOnly) {
        const user = await this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { premiumUntil: true },
        });
        if (!isPremiumActive(user.premiumUntil)) {
          throw new BadRequestException('Khung này chỉ dành cho Premium');
        }
      } else {
        const owned = await this.prisma.userFrame.findUnique({
          where: { userId_frameKey: { userId, frameKey } },
        });
        if (!owned) throw new BadRequestException('Bạn chưa mua khung này');
      }
    }
    await this.prisma.userSettings.update({
      where: { userId },
      data: { equippedFrame: frameKey },
    });
  }
}
