import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  MAX_STREAK_FREEZE,
  StreakService,
} from '../gamification/streak/streak.service';

/** Giá lá chắn streak mua bằng xu — sink đầu tiên cho ví xu, tái dùng đúng
 * cơ chế streak freeze đã có (không tạo mục tiêu tiêu tiền mới). */
const STREAK_FREEZE_PRICE = 300;
/** Xu thưởng cho hoạt động ĐẦU TIÊN mỗi ngày (điểm danh) — xem WalletListener. */
export const DAILY_CHECKIN_REWARD = 5;

/**
 * Ví xu (soft currency) — KHÔNG quy đổi tiền thật. Mọi thay đổi số dư đều
 * đi qua `credit()`/`debit()` để luôn có 1 dòng `CoinTransaction` tương ứng
 * (đối soát/chống gian lận), và `debit()` dùng `updateMany` có điều kiện
 * `balance >= amount` (atomic) thay vì đọc-rồi-ghi để tránh ví âm khi có
 * nhiều request cùng lúc.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
  ) {}

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.userWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return wallet.balance;
  }

  async getRecentTransactions(userId: string, limit = 20) {
    return this.prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async credit(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<number> {
    if (amount <= 0) return this.getBalance(userId);
    const [wallet] = await this.prisma.$transaction([
      this.prisma.userWallet.upsert({
        where: { userId },
        create: { userId, balance: amount },
        update: { balance: { increment: amount } },
      }),
      this.prisma.coinTransaction.create({ data: { userId, amount, reason } }),
    ]);
    return wallet.balance;
  }

  async debit(userId: string, amount: number, reason: string): Promise<number> {
    if (amount <= 0) return this.getBalance(userId);
    const result = await this.prisma.userWallet.updateMany({
      where: { userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new BadRequestException('Không đủ xu');
    }
    await this.prisma.coinTransaction.create({
      data: { userId, amount: -amount, reason },
    });
    return this.getBalance(userId);
  }

  /** Cửa hàng V1: chỉ có 1 món — mua thêm 1 lá chắn streak. */
  async buyStreakFreeze(userId: string) {
    const streak = await this.streak.getStreak(userId);
    if (!streak) throw new BadRequestException('Không tìm thấy người dùng');
    if (streak.streakFreezeCount >= MAX_STREAK_FREEZE) {
      throw new BadRequestException(
        'Bạn đã có tối đa lá chắn streak, không cần mua thêm',
      );
    }
    const balance = await this.debit(
      userId,
      STREAK_FREEZE_PRICE,
      'buy_streak_freeze',
    );
    await this.streak.grantFreeze(userId);
    return { balance, price: STREAK_FREEZE_PRICE };
  }
}
