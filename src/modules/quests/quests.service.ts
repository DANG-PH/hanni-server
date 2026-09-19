import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import {
  isoDateToUtcDate,
  localStudyDate,
  startOfLocalDayInstant,
} from '../../common/time.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  ALL_DONE_BONUS_XU,
  ALL_DONE_KEY,
  selectDailyQuests,
  type QuestKey,
} from './quest.util';

export interface QuestRow {
  key: QuestKey;
  title: string;
  progress: number;
  target: number;
  xu: number;
  claimed: boolean;
}

export interface TodayQuests {
  quests: QuestRow[];
  allDone: boolean;
  allDoneBonusXu: number;
  allDoneClaimed: boolean;
  justClaimedXu: number;
}

/**
 * Nhiệm vụ hàng ngày — tiến độ tính TRỰC TIẾP (live) từ dữ liệu đã có sẵn
 * (ReviewLog/QuizAttempt/PracticeAttempt), KHÔNG lưu counter riêng, giống
 * đúng cách tính điểm ở `LeagueService` — tránh lệch dữ liệu và không cần
 * nghe sự kiện từ nhiều nơi. Bảng `DailyQuestClaim` chỉ giữ 1 việc: chống
 * thưởng xu 2 lần cho cùng 1 nhiệm vụ trong ngày.
 */
@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getToday(userId: string): Promise<TodayQuests> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });
    const now = new Date();
    const dateIso = localStudyDate(now, user.timezone, cutoffHour);
    const dayStart = startOfLocalDayInstant(now, user.timezone, cutoffHour);
    const localDate = isoDateToUtcDate(dateIso);

    const templates = selectDailyQuests(userId, dateIso);
    const progressByKey = await this.computeProgress(
      userId,
      templates.map((t) => t.key),
      dayStart,
    );
    const claims = await this.prisma.dailyQuestClaim.findMany({
      where: { userId, localDate },
      select: { questKey: true },
    });
    const claimedKeys = new Set(claims.map((c) => c.questKey));

    let justClaimedXu = 0;
    const quests: QuestRow[] = [];
    for (const template of templates) {
      const progress = Math.min(
        progressByKey.get(template.key) ?? 0,
        template.target,
      );
      let claimed = claimedKeys.has(template.key);
      if (!claimed && progress >= template.target) {
        const rewarded = await this.tryClaim(
          userId,
          localDate,
          template.key,
          template.xu,
        );
        if (rewarded) {
          claimed = true;
          justClaimedXu += template.xu;
        }
      }
      quests.push({
        key: template.key,
        title: template.title,
        progress,
        target: template.target,
        xu: template.xu,
        claimed,
      });
    }

    const allDone = quests.every((q) => q.claimed);
    let allDoneClaimed = claimedKeys.has(ALL_DONE_KEY);
    if (allDone && !allDoneClaimed) {
      const rewarded = await this.tryClaim(
        userId,
        localDate,
        ALL_DONE_KEY,
        ALL_DONE_BONUS_XU,
      );
      if (rewarded) {
        allDoneClaimed = true;
        justClaimedXu += ALL_DONE_BONUS_XU;
      }
    }

    return {
      quests,
      allDone,
      allDoneBonusXu: ALL_DONE_BONUS_XU,
      allDoneClaimed,
      justClaimedXu,
    };
  }

  /** Ghi nhận đã nhận thưởng TRƯỚC khi cộng xu — nếu 2 request cùng lúc thì
   * ràng buộc `@@unique([userId, localDate, questKey])` sẽ chặn request thứ
   * 2 (bắt lỗi P2002), tránh cộng xu 2 lần. */
  private async tryClaim(
    userId: string,
    localDate: Date,
    questKey: string,
    xu: number,
  ): Promise<boolean> {
    try {
      await this.prisma.dailyQuestClaim.create({
        data: { userId, localDate, questKey, xu },
      });
    } catch {
      return false; // đã tồn tại (race condition) -> không cộng xu nữa
    }
    await this.wallet.credit(userId, xu, `daily_quest:${questKey}`);
    return true;
  }

  private async computeProgress(
    userId: string,
    keys: QuestKey[],
    since: Date,
  ): Promise<Map<QuestKey, number>> {
    const result = new Map<QuestKey, number>();
    await Promise.all(
      keys.map(async (key) => {
        result.set(key, await this.countFor(userId, key, since));
      }),
    );
    return result;
  }

  private async countFor(
    userId: string,
    key: QuestKey,
    since: Date,
  ): Promise<number> {
    switch (key) {
      case 'review_words':
        return this.prisma.reviewLog.count({
          where: { userId, reviewedAt: { gte: since } },
        });
      case 'new_words':
        return this.prisma.reviewLog.count({
          where: { userId, reviewedAt: { gte: since }, reviewType: 'LEARN' },
        });
      case 'complete_quiz':
        return this.prisma.quizAttempt.count({
          where: { userId, completedAt: { gte: since } },
        });
      case 'listening_practice':
        return this.prisma.practiceAttempt.count({
          where: {
            userId,
            skill: 'LISTENING',
            isCorrect: true,
            createdAt: { gte: since },
          },
        });
      case 'pronunciation_practice':
        // KHÔNG lọc isCorrect: true như listening — ghi âm chỉ tự chấm được
        // trên Chrome/Edge (Web Speech API), trình duyệt khác vẫn ghi nhận
        // lượt luyện nhưng isCorrect = null (xem hanni-server/CLAUDE.md mục
        // luyện phát âm) — lọc theo đúng/sai sẽ khiến nhiệm vụ KHÔNG BAO GIỜ
        // hoàn thành được trên trình duyệt không hỗ trợ, tính theo lượt LUYỆN
        // (đã cố gắng nói ra từ) là đủ công bằng cho 1 nhiệm vụ hàng ngày.
        return this.prisma.practiceAttempt.count({
          where: {
            userId,
            skill: 'PRONUNCIATION',
            createdAt: { gte: since },
          },
        });
    }
  }
}
