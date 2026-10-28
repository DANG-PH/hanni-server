import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { localStudyDate } from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { User } from '../../database/entities';
import { isPremiumActive } from '../../modules/premium/premium-plans';
import { RedisService } from './redis.service';

/** Luật hạn mức 1 tính năng: tên (tiền tố khoá Redis) + số lượt/ngày của bản thường và Premium. */
export interface QuotaRule {
  name: string;
  free: number;
  premium: number;
}

export interface QuotaUsage {
  used: number;
  limit: number;
  premium: boolean;
}

/** Khoá tự hết sau 2 ngày — đủ qua hết "ngày học" ở mọi múi giờ. */
const TTL_SEC = 48 * 3600;

/**
 * Hạn mức lượt/ngày của tiện ích AI (mẹo nhớ, chấm câu, phân tích câu, bài đọc) và quét ảnh: 1 bộ đếm Redis mỗi người
 * mỗi "ngày học" (múi giờ người dùng, cắt lúc STREAK_DAY_CUTOFF_HOUR như chuỗi ngày). Trừ lượt TRƯỚC khi gọi AI — 2
 * request song song không vượt được — AI lỗi thì `refund()` trả lại. Câu báo hết lượt do từng tính năng tự viết.
 * (Trợ lý AI và luyện nói đếm thẳng số tin nhắn đã lưu trong DB nên không cần bộ đếm này.)
 */
@Injectable()
export class DailyQuotaService {
  private readonly cutoffHour: number;

  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly redis: RedisService,
  ) {
    this.cutoffHour = config.get('STREAK_DAY_CUTOFF_HOUR', { infer: true });
  }

  /** Lấy 1 lượt. Hết lượt → `null` (không trừ) kèm số liệu để báo. */
  async take(
    userId: string,
    rule: QuotaRule,
  ): Promise<{ ok: boolean } & QuotaUsage> {
    const { key, limit, premium } = await this.slot(userId, rule);
    const used = await this.redis.client.incr(key);
    if (used === 1) await this.redis.client.expire(key, TTL_SEC);
    if (used > limit) {
      await this.redis.client.decr(key);
      return { ok: false, used: limit, limit, premium };
    }
    return { ok: true, used, limit, premium };
  }

  /** Trả lại 1 lượt (AI lỗi, ảnh không có chữ…). */
  async refund(userId: string, rule: QuotaRule): Promise<void> {
    const { key } = await this.slot(userId, rule);
    await this.redis.client.decr(key).catch(() => undefined);
  }

  /** Hôm nay đã dùng bao nhiêu — không trừ lượt. */
  async peek(userId: string, rule: QuotaRule): Promise<QuotaUsage> {
    const { key, limit, premium } = await this.slot(userId, rule);
    const used = Number(await this.redis.client.get(key)) || 0;
    return { used: Math.min(used, limit), limit, premium };
  }

  private async slot(userId: string, rule: QuotaRule) {
    const user = await this.users.findOneOrFail({
      where: { id: userId },
      select: { id: true, premiumUntil: true, timezone: true },
    });
    const premium = isPremiumActive(user.premiumUntil);
    const day = localStudyDate(new Date(), user.timezone, this.cutoffHour);
    return {
      key: `${rule.name}:${userId}:${day}`,
      limit: premium ? rule.premium : rule.free,
      premium,
    };
  }
}
