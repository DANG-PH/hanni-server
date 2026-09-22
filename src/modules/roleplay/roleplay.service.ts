import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { Content } from '@google/genai';
import { ChatRole } from '@prisma/client';
import { pinyin } from 'pinyin-pro';
import { startOfLocalDayInstant } from '../../common/time.util';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CHAT_MODELS } from '../assistant/gemini-models';
import { isPremiumActive } from '../premium/premium-plans';
import {
  buildFeedbackPrompt,
  buildHintPrompt,
  buildSystemPrompt,
  ROLEPLAY_SCENARIOS,
  type RoleplayScenario,
} from './roleplay-scenarios';

/** Free giới hạn riêng (không dùng chung bộ đếm với trợ lý hỏi-đáp — 2 tính
 * năng dùng chung quota Gemini nhưng đo lượt độc lập cho đơn giản, xem
 * `hanni-server/CLAUDE.md` mục Roleplay). Premium bỏ qua hoàn toàn, đúng
 * quyết định "Premium chỉ mở tiện ích AI" đã áp dụng cho trợ lý hỏi-đáp. */
export const FREE_ROLEPLAY_DAILY_LIMIT = 15;
const HISTORY_LIMIT = 20;
/** Nhận xét cuối buổi đọc NHIỀU lượt hơn lúc trả lời (cần nhìn cả buổi mới
 * nhận xét được), nhưng vẫn chặn trần để prompt không phình vô hạn. */
const FEEDBACK_HISTORY_LIMIT = 40;

@Injectable()
export class RoleplayService {
  private readonly logger = new Logger(RoleplayService.name);
  private readonly genAI: GoogleGenAI | null;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY', { infer: true });
    this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  listScenarios() {
    return ROLEPLAY_SCENARIOS.map((s) => ({
      key: s.key,
      titleVi: s.titleVi,
      persona: s.persona,
      hskLevel: s.hskLevel,
    }));
  }

  private scenarioOf(key: string): RoleplayScenario {
    const scenario = ROLEPLAY_SCENARIOS.find((s) => s.key === key);
    if (!scenario)
      throw new BadRequestException('Không tìm thấy tình huống này');
    return scenario;
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.roleplaySession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return sessions.map((s) => {
      const scenario = ROLEPLAY_SCENARIOS.find(
        (sc) => sc.key === s.scenarioKey,
      );
      return {
        id: s.id,
        scenarioKey: s.scenarioKey,
        titleVi: scenario?.titleVi ?? s.scenarioKey,
        persona: scenario?.persona ?? '',
        updatedAt: s.updatedAt,
        lastMessage: s.messages[0]?.text ?? null,
      };
    });
  }

  async getMessages(userId: string, sessionId: string) {
    await this.requireOwnSession(userId, sessionId);
    return this.prisma.roleplayMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async startSession(userId: string, scenarioKey: string) {
    const scenario = this.scenarioOf(scenarioKey);
    const session = await this.prisma.roleplaySession.create({
      data: { userId, scenarioKey },
    });
    const message = await this.prisma.roleplayMessage.create({
      data: {
        sessionId: session.id,
        role: ChatRole.MODEL,
        text: scenario.openingLineZh,
        pinyin: this.pinyinOf(scenario.openingLineZh),
      },
    });
    return { sessionId: session.id, message };
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.roleplaySession.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  async reply(userId: string, sessionId: string, text: string) {
    await this.checkDailyQuota(userId);
    const session = await this.requireOwnSession(userId, sessionId);
    const scenario = this.scenarioOf(session.scenarioKey);

    if (!this.genAI) {
      throw new BadRequestException(
        'Luyện nói với AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
      );
    }

    const history = await this.prisma.roleplayMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    history.reverse();

    await this.prisma.roleplayMessage.create({
      data: { sessionId, role: ChatRole.USER, text },
    });

    const contents: Content[] = [
      ...history.map((h) => ({
        role: h.role === ChatRole.USER ? ('user' as const) : ('model' as const),
        parts: [{ text: h.text }],
      })),
      { role: 'user' as const, parts: [{ text }] },
    ];

    const replyText = await this.generateReply(contents, scenario);
    const saved = await this.prisma.roleplayMessage.create({
      data: {
        sessionId,
        role: ChatRole.MODEL,
        text: replyText,
        pinyin: this.pinyinOf(replyText),
      },
    });
    await this.prisma.roleplaySession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    return saved;
  }

  /** Gợi ý 1 câu người học có thể trả lời tiếp — KHÔNG lưu vào lịch sử hội
   * thoại (chỉ là gợi ý tạm thời, không phải lượt nói thật của người học).
   * Dùng CHUNG hạn mức/ngày với `reply()` (gọi lại `checkDailyQuota()`) —
   * nếu đã hết lượt AI hôm nay thì gợi ý cũng bị chặn, đơn giản hơn dựng bộ
   * đếm riêng cho 1 tính năng phụ. */
  async hint(userId: string, sessionId: string) {
    await this.checkDailyQuota(userId);
    const session = await this.requireOwnSession(userId, sessionId);
    const scenario = this.scenarioOf(session.scenarioKey);

    if (!this.genAI) {
      throw new BadRequestException(
        'Luyện nói với AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
      );
    }

    const history = await this.prisma.roleplayMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    history.reverse();
    const contents: Content[] = history.map((h) => ({
      role: h.role === ChatRole.USER ? ('user' as const) : ('model' as const),
      parts: [{ text: h.text }],
    }));

    const systemInstruction = buildHintPrompt(scenario);
    for (const model of CHAT_MODELS) {
      try {
        const response = await this.genAI.models.generateContent({
          model,
          contents,
          config: { systemInstruction },
        });
        const text = response.text?.trim();
        if (text) return this.parseHint(text);
      } catch (err) {
        this.logger.warn(
          `[Roleplay] hint model ${model} lỗi: ${(err as Error).message}`,
        );
      }
    }
    throw new BadRequestException('Chưa tạo được gợi ý, thử lại nhé.');
  }

  /**
   * Nhận xét ngắn sau khi kết thúc buổi luyện.
   *
   * Lý do có: trước đó bấm "Kết thúc" là xoá luôn hội thoại, người học không
   * nhận lại gì — luyện xong không biết mình sai chỗ nào thì khó tiến bộ, mà
   * `/listening` và `/pronunciation` đều đã có phần "kết quả buổi luyện".
   *
   * KHÔNG lưu nhận xét vào DB: hội thoại đóng vai vốn bị xoá khi kết thúc
   * (nó là bài tập, không phải kiến thức cần tra lại), lưu riêng nhận xét sẽ
   * thành dữ liệu mồ côi. Dùng CHUNG hạn mức/ngày như `reply()`/`hint()`.
   */
  async feedback(userId: string, sessionId: string) {
    const session = await this.requireOwnSession(userId, sessionId);
    const scenario = this.scenarioOf(session.scenarioKey);

    const history = await this.prisma.roleplayMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: FEEDBACK_HISTORY_LIMIT,
    });
    const userTurns = history.filter((h) => h.role === ChatRole.USER).length;
    // Chưa nói câu nào thì không có gì để nhận xét — trả lời thẳng thay vì
    // đốt 1 lượt quota Gemini để model tự bịa ra nhận xét.
    if (userTurns === 0) {
      return {
        userTurns: 0,
        feedbackVi:
          'Bạn chưa nói câu nào trong buổi này nên chưa có gì để nhận xét. Thử lại và nói vài câu nhé!',
      };
    }

    await this.checkDailyQuota(userId);
    if (!this.genAI) {
      throw new BadRequestException(
        'Luyện nói với AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
      );
    }

    const contents: Content[] = history.map((h) => ({
      role: h.role === ChatRole.USER ? ('user' as const) : ('model' as const),
      parts: [{ text: h.text }],
    }));
    const systemInstruction = buildFeedbackPrompt(scenario);
    for (const model of CHAT_MODELS) {
      try {
        const response = await this.genAI.models.generateContent({
          model,
          contents,
          config: { systemInstruction },
        });
        const text = response.text?.trim();
        if (text) return { userTurns, feedbackVi: text };
      } catch (err) {
        this.logger.warn(
          `[Roleplay] feedback model ${model} lỗi: ${(err as Error).message}`,
        );
      }
    }
    throw new BadRequestException('Chưa tạo được nhận xét, thử lại nhé.');
  }

  /** Format mong đợi 2 dòng "中文：..." / "Nghĩa：..." — nếu Gemini trả sai
   * format (không tuân thủ hoàn hảo) thì rơi về coi cả đoạn là câu gợi ý,
   * bỏ trống nghĩa, còn hơn báo lỗi cho 1 tính năng phụ không quan trọng. */
  private parseHint(text: string): { suggestionZh: string; meaningVi: string } {
    const zhMatch = text.match(/中文[：:]\s*(.+)/);
    const viMatch = text.match(/Nghĩa[：:]\s*(.+)/);
    if (zhMatch) {
      return {
        suggestionZh: zhMatch[1].trim(),
        meaningVi: viMatch?.[1]?.trim() ?? '',
      };
    }
    return { suggestionZh: text, meaningVi: '' };
  }

  private async generateReply(
    contents: Content[],
    scenario: RoleplayScenario,
  ): Promise<string> {
    const systemInstruction = buildSystemPrompt(scenario);
    for (const model of CHAT_MODELS) {
      try {
        const response = await this.genAI!.models.generateContent({
          model,
          contents,
          config: { systemInstruction },
        });
        const text = response.text?.trim();
        if (text) return text;
      } catch (err) {
        this.logger.warn(
          `[Roleplay] model ${model} lỗi: ${(err as Error).message}`,
        );
      }
    }
    return '不好意思，我没听清楚，你能再说一次吗？';
  }

  private pinyinOf(zh: string): string {
    return pinyin(zh, { toneType: 'symbol', nonZh: 'consecutive' });
  }

  private async requireOwnSession(userId: string, sessionId: string) {
    const session = await this.prisma.roleplaySession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại này');
    }
    return session;
  }

  /** Y hệt `AssistantService.checkDailyAskQuota()` — đếm theo "ngày học"
   * (timezone user + STREAK_DAY_CUTOFF_HOUR), Premium bỏ qua hoàn toàn. */
  private async checkDailyQuota(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { premiumUntil: true, timezone: true },
    });
    if (isPremiumActive(user.premiumUntil)) return;

    const cutoffHour = this.config.get('STREAK_DAY_CUTOFF_HOUR', {
      infer: true,
    });
    const since = startOfLocalDayInstant(new Date(), user.timezone, cutoffHour);
    const usedToday = await this.prisma.roleplayMessage.count({
      where: {
        role: ChatRole.USER,
        createdAt: { gte: since },
        session: { userId },
      },
    });
    if (usedToday >= FREE_ROLEPLAY_DAILY_LIMIT) {
      throw new ForbiddenException(
        `Bạn đã dùng hết ${FREE_ROLEPLAY_DAILY_LIMIT} lượt luyện nói miễn phí hôm nay. Nâng cấp Premium để luyện không giới hạn.`,
      );
    }
  }
}
