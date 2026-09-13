import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ChatRole, SrsState } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { Env } from '../../config/env.validation';
import { EmbeddedChunk, InMemoryVectorStore } from './rag/vector-store';

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

const LEARNED_INTERVAL_DAYS = 21;
const HISTORY_LIMIT = 16;
// dàn call embedding ra để không vượt rate-limit/phút của Gemini free tier
const EMBED_DELAY_MS = 200;

export interface AssistantStatus {
  configured: boolean;
  indexedChunks: number;
  totalGrammarPoints: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

interface PersistedIndex {
  chunks: EmbeddedChunk[];
}

// Trợ lý AI Hanni: RAG trên các điểm ngữ pháp ĐÃ CÓ giải thích thật (không
// phải toàn bộ đại cương — phần chỉ liệt kê từ loại/kiểu câu không có nội
// dung để ground), cộng với vài thông tin cá nhân hoá (streak, số từ đã
// thuộc, đề xuất từ khảo sát đầu vào) để trả lời tự nhiên hơn là chatbot
// tra cứu thuần. Kiến trúc tham khảo từ project tech-books-backend
// (@google/genai, in-memory vector store, model fallback chain).
@Injectable()
export class AssistantService implements OnModuleInit {
  private readonly logger = new Logger(AssistantService.name);
  private readonly genAI: GoogleGenAI | null;
  private readonly vectorStore = new InMemoryVectorStore();
  private readonly indexPath = join(
    process.cwd(),
    '.cache',
    'assistant-index.json',
  );
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;

  private readonly CHAT_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
  ];
  private readonly EMBED_MODEL = 'gemini-embedding-001';
  private readonly EMBED_BATCH_SIZE = 20;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY', { infer: true });
    this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  onModuleInit(): void {
    if (!this.genAI) {
      this.logger.warn(
        '[Assistant] GEMINI_API_KEY chưa cấu hình — trợ lý AI sẽ báo chưa bật.',
      );
      return;
    }
    this.buildIndex().catch((err: Error) => {
      this.lastError = err.message;
      this.logger.error(`[Assistant] đánh index thất bại: ${err.message}`);
    });
  }

  async getStatus(): Promise<AssistantStatus> {
    const totalGrammarPoints = await this.prisma.grammarPoint.count({
      where: { explanationVi: { not: '' } },
    });
    return {
      configured: Boolean(this.genAI),
      indexedChunks: this.vectorStore.size,
      totalGrammarPoints,
      lastSyncAt: this.lastSyncAt ? this.lastSyncAt.toISOString() : null,
      lastError: this.lastError,
    };
  }

  private async loadPersistedIndex(): Promise<EmbeddedChunk[] | null> {
    try {
      const raw = await fs.readFile(this.indexPath, 'utf-8');
      const saved = JSON.parse(raw) as PersistedIndex;
      return saved.chunks ?? [];
    } catch {
      return null;
    }
  }

  private async persistIndex(): Promise<void> {
    await fs
      .mkdir(join(process.cwd(), '.cache'), { recursive: true })
      .catch(() => undefined);
    const payload: PersistedIndex = { chunks: this.vectorStore.dump() };
    await fs.writeFile(this.indexPath, JSON.stringify(payload));
  }

  // Chỉ đánh index lại khi số điểm ngữ pháp có giải thích thật đã thay đổi
  // so với lần trước (đơn giản hoá so với đối chiếu từng dòng) — tránh đốt
  // quota embedding mỗi lần restart app khi nội dung ngữ pháp không đổi.
  private async buildIndex(): Promise<void> {
    if (!this.genAI) return;
    const points = await this.prisma.grammarPoint.findMany({
      where: { explanationVi: { not: '' } },
      select: {
        id: true,
        hskLevel: true,
        titleVi: true,
        titleZh: true,
        summaryVi: true,
        explanationVi: true,
        patterns: true,
      },
      orderBy: [{ hskLevel: 'asc' }, { orderIndex: 'asc' }],
    });

    const cached = await this.loadPersistedIndex();
    if (cached && cached.length === points.length) {
      this.vectorStore.load(cached);
      this.lastSyncAt = new Date();
      this.logger.log(
        `[Assistant] Nạp ${cached.length} đoạn ngữ pháp từ index có sẵn`,
      );
      return;
    }

    const embedded: EmbeddedChunk[] = [];
    for (let i = 0; i < points.length; i += this.EMBED_BATCH_SIZE) {
      const batch = points.slice(i, i + this.EMBED_BATCH_SIZE);
      const texts = batch.map((p) =>
        [
          `[Ngữ pháp HSK ${p.hskLevel} - "${p.titleVi}" (${p.titleZh})]`,
          p.summaryVi,
          p.explanationVi,
          p.patterns.length ? `Mẫu câu: ${p.patterns.join('; ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
      try {
        const vectors = await this.embedBatch(texts);
        batch.forEach((p, idx) =>
          embedded.push({
            grammarPointId: p.id,
            title: p.titleVi,
            text: texts[idx],
            embedding: vectors[idx],
          }),
        );
      } catch (err) {
        this.lastError = (err as Error).message;
        this.logger.warn(
          `[Assistant] Bỏ qua 1 nhóm điểm ngữ pháp khi đánh index: ${(err as Error).message}`,
        );
      }
      await new Promise((r) => setTimeout(r, EMBED_DELAY_MS));
    }

    this.vectorStore.replaceAll(embedded);
    this.lastSyncAt = new Date();
    await this.persistIndex();
    this.logger.log(
      `[Assistant] Đã đánh index ${embedded.length} điểm ngữ pháp`,
    );
  }

  /** Cuộc trò chuyện đang mở của user — mỗi user chỉ có 1, tự tạo nếu chưa có. */
  private async getOrCreateSession(userId: string) {
    const existing = await this.prisma.chatSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.chatSession.create({ data: { userId } });
  }

  async getMessages(userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!session) return [];
    return this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearSession(userId: string): Promise<{ ok: true }> {
    await this.prisma.chatSession.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async ask(userId: string, message: string): Promise<{ message: string }> {
    const session = await this.getOrCreateSession(userId);
    const replyText = await this.generateReply(userId, message, session.id);

    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { sessionId: session.id, role: ChatRole.USER, text: message },
      }),
      this.prisma.chatMessage.create({
        data: { sessionId: session.id, role: ChatRole.MODEL, text: replyText },
      }),
      this.prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return { message: replyText };
  }

  private async generateReply(
    userId: string,
    message: string,
    sessionId: string,
  ): Promise<string> {
    if (!this.genAI) {
      return 'Trợ lý AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.';
    }
    try {
      const history = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
      });
      history.reverse();

      const userFacts = await this.buildUserFactsBlock(userId);

      let relevant: EmbeddedChunk[] = [];
      try {
        const queryEmbedding = await this.embedText(message);
        relevant = this.vectorStore.search(queryEmbedding, 4);
      } catch (err) {
        this.lastError = `embed câu hỏi: ${(err as Error).message}`;
        this.logger.warn(
          `[Assistant] embed câu hỏi thất bại: ${(err as Error).message}`,
        );
      }
      const context = relevant
        .map((c) => `[Ngữ pháp Hanni - "${c.title}"]\n${c.text}`)
        .join('\n\n---\n\n');

      const systemPrompt =
        this.config.get('AI_SYSTEM_PROMPT', { infer: true }) ||
        'Bạn là Hanni, trợ lý AI thân thiện của app học tiếng Trung theo chuẩn HSK 3.0. Trả lời tự nhiên, ấm áp, ngắn gọn bằng kiến thức tiếng Trung của bạn — không chỉ hành xử như công cụ tra cứu.';

      const prompt = `
${systemPrompt}

Thông tin học tập hiện tại của người đang hỏi (dùng để cá nhân hoá câu trả lời khi phù hợp):
${userFacts}

${
  context
    ? `Một vài điểm ngữ pháp Hanni đã soạn sẵn có thể liên quan — chỉ dùng làm gợi ý, không giới hạn câu trả lời:\n---\n${context}\n---\n`
    : ''
}
Câu hỏi: ${message}

Hướng dẫn trả lời:
- Trả lời câu hỏi tự nhiên, đầy đủ bằng kiến thức tiếng Trung của bạn — không cần bó buộc trong các đoạn trích ở trên.
- Nếu có điểm ngữ pháp Hanni liên quan (xem phần trên), có thể nhắc khéo tới bài đó trong app như gợi ý đọc thêm.
- QUAN TRỌNG: chỉ nói một điểm ngữ pháp "có trong Hanni" nếu nó thực sự xuất hiện ở phần trích trên — nếu dùng kiến thức chung ngoài phần đó, đừng ngụ ý là đã có sẵn trong app.
- Dùng thông tin học tập cá nhân ở trên khi câu hỏi liên quan tới tiến độ/streak/nên học gì hôm nay của chính người dùng.
- Trả lời ngắn gọn, có thể dùng gạch đầu dòng và **in đậm** cho từ khoá quan trọng.
      `.trim();

      const reply = await this.generateWithFallback(
        this.buildContents(prompt, history),
      );
      return reply ?? this.pickRandom(this.OVERLOADED_REPLIES);
    } catch (err) {
      this.lastError = (err as Error).message;
      this.logger.error(`[Assistant] ask lỗi: ${(err as Error).message}`);
      return 'Có lỗi xảy ra, thử lại nhé.';
    }
  }

  /** Ground truth về tiến độ CHÍNH người đang hỏi — tránh AI đoán bừa streak/số từ. */
  private async buildUserFactsBlock(userId: string): Promise<string> {
    const [streak, learnedCount, dueCount, onboarding] = await Promise.all([
      this.prisma.userStreak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      this.prisma.userWordProgress.count({
        where: {
          userId,
          OR: [
            { learnedAt: { not: null } },
            {
              state: SrsState.REVIEW,
              intervalDays: { gte: LEARNED_INTERVAL_DAYS },
            },
          ],
        },
      }),
      this.prisma.userWordProgress.count({
        where: {
          userId,
          isSuspended: false,
          state: { not: SrsState.NEW },
          dueAt: { lte: new Date() },
        },
      }),
      this.prisma.onboardingProfile.findUnique({
        where: { userId },
        select: { recommendedLevel: true, targetLevel: true },
      }),
    ]);

    const lines = [
      `Chuỗi ngày học liên tiếp hiện tại: ${streak?.currentStreak ?? 0} ngày (kỷ lục: ${streak?.longestStreak ?? 0} ngày).`,
      `Số từ đã thuộc (ôn đều, chu kỳ ≥ ${LEARNED_INTERVAL_DAYS} ngày): ${learnedCount} từ.`,
      `Số từ đang đến hạn ôn: ${dueCount} từ.`,
    ];
    if (onboarding) {
      lines.push(
        `Cấp HSK Hanni đề xuất theo khảo sát đầu vào: HSK ${onboarding.recommendedLevel}` +
          (onboarding.targetLevel
            ? `, mục tiêu đang nhắm thi HSK ${onboarding.targetLevel}.`
            : '.'),
      );
    }
    return lines.join('\n');
  }

  private readonly OVERLOADED_REPLIES = [
    'AI hơi quá tải rồi, thử hỏi lại sau ít phút nhé.',
    'Đang đông người hỏi quá, đợi chút rồi hỏi lại giúp mình nhé.',
    'AI đang nghỉ mệt xíu, lát quay lại hỏi tiếp nhé.',
  ];

  private pickRandom(options: string[]): string {
    return options[Math.floor(Math.random() * options.length)];
  }

  private async embedText(text: string): Promise<number[]> {
    const [values] = await this.embedBatch([text]);
    return values;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.genAI!.models.embedContent({
      model: this.EMBED_MODEL,
      contents: texts,
    });
    const embeddings = result.embeddings;
    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error(
        `Gemini trả về ${embeddings?.length ?? 0} embedding cho ${texts.length} đoạn`,
      );
    }
    return embeddings.map((e) => {
      if (!e.values || e.values.length === 0) {
        throw new Error('Gemini trả về embedding rỗng');
      }
      return e.values;
    });
  }

  private buildContents(
    prompt: string,
    history: { role: ChatRole; text: string }[],
  ): GeminiContent[] {
    const historyContents: GeminiContent[] = history.map((h) => ({
      role: h.role === ChatRole.USER ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));
    return [...historyContents, { role: 'user', parts: [{ text: prompt }] }];
  }

  private async generateWithFallback(
    contents: GeminiContent[],
  ): Promise<string | null> {
    for (const modelName of this.CHAT_MODELS) {
      try {
        const response = await this.genAI!.models.generateContent({
          model: modelName,
          contents,
        });
        if (response.text) return response.text;
      } catch (err) {
        const status =
          (err as { status?: number }).status ?? (err as Error).message;
        this.logger.warn(
          `[Assistant] model ${modelName} lỗi (${status}), thử model kế tiếp...`,
        );
      }
    }
    return null;
  }
}
