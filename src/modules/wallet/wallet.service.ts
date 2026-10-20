import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { CoinTransaction, UserWallet } from '../../database/entities';
import { findOrCreate } from '../../database/repository.util';
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
 * (đối soát/chống gian lận). Cộng/trừ chạy NGAY TRONG DB (`balance = balance ± n`), `debit()` kèm điều
 * kiện `balance >= amount` — không đọc-rồi-ghi, nên nhiều request cùng lúc không làm ví âm hay mất xu.
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserWallet)
    private readonly wallets: Repository<UserWallet>,
    @InjectRepository(CoinTransaction)
    private readonly transactions: Repository<CoinTransaction>,
    private readonly streak: StreakService,
  ) {}

  async getBalance(userId: string): Promise<number> {
    // Ví tạo lười: lần đầu hỏi số dư thì tạo ví 0 xu.
    const wallet = await findOrCreate(this.wallets, { userId });
    return wallet.balance;
  }

  async getRecentTransactions(userId: string, limit = 20) {
    return this.transactions.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async credit(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<number> {
    if (amount <= 0) return this.getBalance(userId);
    return this.dataSource.transaction(async (db) => {
      await db
        .createQueryBuilder()
        .insert()
        .into(UserWallet)
        .values({ userId })
        .orIgnore()
        .execute();
      await db.increment(UserWallet, { userId }, 'balance', amount);
      await db.insert(CoinTransaction, { userId, amount, reason });
      const wallet = await db.findOneByOrFail(UserWallet, { userId });
      return wallet.balance;
    });
  }

  async debit(userId: string, amount: number, reason: string): Promise<number> {
    if (amount <= 0) return this.getBalance(userId);
    const result = await this.wallets.decrement(
      { userId, balance: MoreThanOrEqual(amount) },
      'balance',
      amount,
    );
    if (!result.affected) {
      throw new BadRequestException('Không đủ xu');
    }
    await this.transactions.insert({ userId, amount: -amount, reason });
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
