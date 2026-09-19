import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TITLE_CATALOG, type Title } from './title-catalog';

export interface TitleCatalogItem extends Title {
  owned: boolean;
  equipped: boolean;
}

/**
 * Cửa hàng danh hiệu — cùng mô hình mua-đứt-bằng-xu như `ShopService`
 * (khung avatar), tách RIÊNG thành service khác vì hiển thị hoàn toàn khác
 * (chữ cạnh tên, không phải viền quanh avatar) dù cơ chế mua/dùng giống hệt
 * nhau — không gộp chung 1 "cosmetic system" tổng quát vì mới có 2 loại vật
 * phẩm, gộp sớm sẽ là abstraction thừa cho lúc này.
 */
@Injectable()
export class TitleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async getCatalog(userId: string): Promise<{
    titles: TitleCatalogItem[];
    balance: number;
  }> {
    const [owned, settings, balance] = await Promise.all([
      this.prisma.userTitle.findMany({
        where: { userId },
        select: { titleKey: true },
      }),
      this.prisma.userSettings.findUnique({
        where: { userId },
        select: { equippedTitle: true },
      }),
      this.wallet.getBalance(userId),
    ]);
    const ownedKeys = new Set(owned.map((t) => t.titleKey));
    const titles = TITLE_CATALOG.map((title) => ({
      ...title,
      owned: ownedKeys.has(title.key),
      equipped: settings?.equippedTitle === title.key,
    }));
    return { titles, balance };
  }

  /** Tạo quyền sở hữu TRƯỚC rồi mới trừ xu, hoàn tác nếu trừ xu thất bại —
   * đúng thứ tự đã sửa ở `ShopService.buy()` (xem lý do ở đó, tránh trừ xu
   * 2 lần khi 2 request mua trùng chạy song song). */
  async buy(userId: string, titleKey: string): Promise<TitleCatalogItem> {
    const title = TITLE_CATALOG.find((t) => t.key === titleKey);
    if (!title) throw new BadRequestException('Không tìm thấy danh hiệu này');

    try {
      await this.prisma.userTitle.create({ data: { userId, titleKey } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('Bạn đã sở hữu danh hiệu này rồi');
      }
      throw err;
    }

    try {
      await this.wallet.debit(userId, title.price, `buy_title:${titleKey}`);
    } catch (err) {
      await this.prisma.userTitle
        .delete({ where: { userId_titleKey: { userId, titleKey } } })
        .catch(() => undefined);
      throw err;
    }
    return { ...title, owned: true, equipped: false };
  }

  /** `titleKey: null` = bỏ danh hiệu. */
  async equip(userId: string, titleKey: string | null): Promise<void> {
    if (titleKey !== null) {
      const owned = await this.prisma.userTitle.findUnique({
        where: { userId_titleKey: { userId, titleKey } },
      });
      if (!owned) throw new BadRequestException('Bạn chưa mua danh hiệu này');
    }
    await this.prisma.userSettings.update({
      where: { userId },
      data: { equippedTitle: titleKey },
    });
  }
}
