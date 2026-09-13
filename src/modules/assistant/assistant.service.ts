import {
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import type { Content, FunctionCall, Tool } from '@google/genai';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ChatRole, SrsState } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { Env } from '../../config/env.validation';
import { EmbeddedChunk, InMemoryVectorStore } from './rag/vector-store';

/** Hành động phía client thực hiện được sau khi model gọi 1 tool điều
 * hướng — trợ lý chỉ ĐƯA RA đường dẫn, người dùng tự bấm mở (xem
 * executeTool()), không tự ý chuyển trang thay người dùng. */
export interface AssistantAction {
  type: 'navigate';
  path: string;
  label: string;
}

/** Trang tĩnh trợ lý có thể gợi ý mở — khớp route thật ở client. */
const PAGE_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  learn: '/learn',
  vocabulary: '/vocabulary',
  grammar: '/grammar',
  listening: '/listening',
  pronunciation: '/pronunciation',
  writing: '/writing',
  exams: '/exams',
  leaderboard: '/leaderboard',
  progress: '/progress',
  watch: '/watch',
  onboarding: '/onboarding',
  settings: '/settings',
};
const PAGE_LABELS_VI: Record<string, string> = {
  dashboard: 'Trang chủ',
  learn: 'Lộ trình học',
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  listening: 'Luyện nghe',
  pronunciation: 'Luyện phát âm',
  writing: 'Luyện viết Hán tự',
  exams: 'Kiểm tra HSK',
  leaderboard: 'Bảng xếp hạng',
  progress: 'Tiến độ học tập',
  watch: 'Học qua video',
  onboarding: 'Khảo sát lộ trình',
  settings: 'Cài đặt',
};

/** 2 tool duy nhất trợ lý được gọi — cả 2 đều chỉ TRẢ VỀ đường dẫn cho
 * client hiện nút bấm, không có tool nào thật sự "thay đổi dữ liệu" nên
 * không cần xác nhận trước khi gọi. */
const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'navigate_to_page',
        description:
          'Lấy đường dẫn tới 1 trang trong app Hanni khi người dùng muốn mở/vào 1 mục cụ thể (lộ trình, từ vựng, ngữ pháp, luyện nghe, luyện phát âm, luyện viết, kiểm tra HSK, bảng xếp hạng, tiến độ...). KHÔNG dùng cho video — video dùng open_video. GỌI NGAY khi thấy ý định này, kể cả khi người dùng không nói rõ cấp HSK — `level` là tuỳ chọn, cứ để trống nếu không rõ, ĐỪNG hỏi lại người dùng trước khi gọi tool.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            page: {
              type: Type.STRING,
              description: 'Tên trang cần mở',
              enum: Object.keys(PAGE_PATHS),
            },
            level: {
              type: Type.INTEGER,
              description:
                'Cấp HSK (1-9) muốn lọc/xem — chỉ áp dụng cho trang learn hoặc vocabulary, bỏ trống nếu không có.',
            },
          },
          required: ['page'],
        },
      },
      {
        name: 'open_video',
        description:
          'Tìm và lấy đường dẫn tới 1 video học tiếng Trung trong thư viện Hanni theo tên hoặc chủ đề người dùng nhắc tới. GỌI NGAY khi người dùng muốn xem/mở 1 video (kể cả khi chỉ nói chung chung như "video bất kỳ", "video gì cũng được") — dùng từ khoá tốt nhất có được, ĐỪNG hỏi lại người dùng trước khi gọi tool.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'Từ khoá tên hoặc chủ đề video cần tìm',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];

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

interface IndexSourceItem {
  sourceId: string;
  title: string;
  text: string;
}

/** Khớp với FAQ hiển thị ở trang chủ (`app/(site)/page.tsx` bên client) —
 * chép tay vì đây là nội dung tĩnh nhỏ, không đáng để 2 repo phụ thuộc nhau. */
const FAQ_ENTRIES: [question: string, answer: string][] = [
  [
    'Mới bắt đầu học tiếng Trung, mình nên học từ đâu?',
    'Bạn có thể bắt đầu với lộ trình HSK 1. Làm quen với Hán tự và pinyin trong từng bài, nghe phát âm rồi dùng flashcard để ôn lại những từ đã học.',
  ],
  [
    'Hanni giúp mình ghi nhớ từ vựng như thế nào?',
    'Sau mỗi thẻ, bạn đánh giá mức độ ghi nhớ. Lịch ôn được điều chỉnh để bạn gặp lại từ vựng đúng lúc. Bạn có thể chọn cách ôn và số từ mới mỗi ngày trong cài đặt.',
  ],
  [
    'Mình có thể chọn cấp HSK phù hợp không?',
    'Có. Lộ trình và thư viện từ vựng có bộ lọc cấp HSK. Chọn cấp phù hợp với kiến thức hiện tại, sau đó theo dõi những từ đang học và đã thuộc trong trang tiến độ.',
  ],
  [
    'Có cần biết tiếng Anh để sử dụng Hanni không?',
    'Giao diện được viết bằng tiếng Việt. Từ vựng hiển thị nghĩa tiếng Việt khi đã có bản dịch; những mục chưa có sẽ ghi rõ nghĩa tiếng Anh hoặc trạng thái đang cập nhật.',
  ],
  [
    'Mình có thể luyện tập trên điện thoại không?',
    'Có. Bạn có thể mở Hanni bằng trình duyệt trên điện thoại, dùng flashcard, nghe âm thanh và tiếp tục học với cùng tài khoản. Tính năng ghi âm cần quyền truy cập micro của trình duyệt.',
  ],
  [
    'Tiến độ học có được lưu lại không?',
    'Các lượt ôn đã gửi thành công được lưu vào tài khoản. Trang tổng quan, tiến độ và huy hiệu sẽ giúp bạn theo dõi hành trình học. Phần ghi âm luyện nói dùng để nghe lại trên thiết bị trong buổi luyện hiện tại.',
  ],
];

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

  // TODO(scale): GEMINI_API_KEY hiện dùng chung 1 key free tier (quota rất
  // thấp — đã từng hết quota embed_content chỉ vì vài chục lượt hỏi/đánh
  // index trong lúc test, xem README lịch sử buildIndex()). Throttle hiện
  // tại (`@Throttle 20/60s` ở assistant.controller.ts) chỉ chặn 1 user spam
  // nhanh — KHÔNG bảo vệ quota chung khi có nhiều user thật cùng dùng cùng
  // lúc. Trước khi ra mắt rộng cần: (1) nâng lên gói Gemini trả phí (bỏ giới
  // hạn free tier) hoặc (2) thêm giới hạn số lượt hỏi/ngày mỗi user (DB đếm
  // theo ChatMessage.createdAt, kiểu quota giống PracticeAttempt) — có thể
  // gắn với tính năng nạp tiền/gói trả phí sau này (chưa làm, để dành bàn
  // riêng khi cần) để user trả phí có hạn mức cao hơn user miễn phí.

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

  /** Nguồn ngữ pháp (từ DB) + FAQ Hanni (tĩnh, khớp với trang chủ) gộp
   * chung 1 danh sách để đánh index cùng cơ chế resume bên dưới. */
  private async collectIndexSources(): Promise<IndexSourceItem[]> {
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
    const grammarItems: IndexSourceItem[] = points.map((p) => ({
      sourceId: `grammar:${p.id}`,
      title: p.titleVi,
      text: [
        `[Ngữ pháp HSK ${p.hskLevel} - "${p.titleVi}" (${p.titleZh})]`,
        p.summaryVi,
        p.explanationVi,
        p.patterns.length ? `Mẫu câu: ${p.patterns.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    }));
    const faqItems: IndexSourceItem[] = FAQ_ENTRIES.map(([q, a], i) => ({
      sourceId: `faq:${i}`,
      title: q,
      text: `[Câu hỏi thường gặp Hanni - "${q}"]\n${a}`,
    }));
    return [...grammarItems, ...faqItems];
  }

  // Chỉ embed những đoạn CHƯA có trong index cũ (so theo sourceId, không
  // phải đếm tổng số) — free tier Gemini giới hạn ~100 lượt embed/ngày,
  // không đủ đánh hết ~240 đoạn trong 1 lần, nên nếu dừng giữa chừng (hết
  // quota/app restart) thì lần sau CHỈ đánh tiếp phần còn thiếu thay vì
  // embed lại từ đầu — tốn gấp đôi/ba quota một cách vô ích.
  private async buildIndex(): Promise<void> {
    if (!this.genAI) return;
    const sources = await this.collectIndexSources();

    const cached = (await this.loadPersistedIndex()) ?? [];
    const sourceIds = new Set(sources.map((s) => s.sourceId));
    // bỏ chunk của nguồn đã xoá/không còn hợp lệ nữa
    const stillValid = cached.filter((c) => sourceIds.has(c.sourceId));
    const cachedIds = new Set(stillValid.map((c) => c.sourceId));
    const missing = sources.filter((s) => !cachedIds.has(s.sourceId));

    if (missing.length === 0) {
      this.vectorStore.load(stillValid);
      this.lastSyncAt = new Date();
      this.logger.log(
        `[Assistant] Nạp ${stillValid.length} đoạn từ index có sẵn`,
      );
      if (stillValid.length !== cached.length) await this.persistIndex();
      return;
    }

    this.logger.log(
      `[Assistant] ${missing.length}/${sources.length} đoạn chưa đánh index — bắt đầu…`,
    );
    const embedded: EmbeddedChunk[] = [...stillValid];
    let quotaExceeded = false;
    for (let i = 0; i < missing.length; i += this.EMBED_BATCH_SIZE) {
      const batch = missing.slice(i, i + this.EMBED_BATCH_SIZE);
      const texts = batch.map((s) => s.text);
      try {
        const vectors = await this.embedBatch(texts);
        batch.forEach((s, idx) =>
          embedded.push({
            sourceId: s.sourceId,
            title: s.title,
            text: texts[idx],
            embedding: vectors[idx],
          }),
        );
      } catch (err) {
        if (this.isQuotaExceededError(err)) {
          this.lastError =
            'Hết quota embedding Gemini miễn phí trong ngày — sẽ tự đánh index tiếp ở lần chạy sau.';
          this.logger.warn(`[Assistant] ${this.lastError}`);
          quotaExceeded = true;
          break;
        }
        this.lastError = (err as Error).message;
        this.logger.warn(
          `[Assistant] Bỏ qua 1 nhóm đoạn khi đánh index: ${(err as Error).message}`,
        );
      }
      await new Promise((r) => setTimeout(r, EMBED_DELAY_MS));
    }

    this.vectorStore.replaceAll(embedded);
    this.lastSyncAt = new Date();
    await this.persistIndex();
    this.logger.log(
      `[Assistant] Đã đánh index ${embedded.length}/${sources.length} đoạn${quotaExceeded ? ' (dở dang, hết quota — tự tiếp ở lần chạy sau)' : ''}`,
    );
  }

  private isQuotaExceededError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('"code":429');
  }

  private readonly TITLE_MAX_LEN = 80;

  /** Danh sách cuộc trò chuyện của user, mới nhất trước — như ChatGPT/Claude. */
  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  createSession(userId: string) {
    return this.prisma.chatSession.create({ data: { userId } });
  }

  /** 404 nếu không phải cuộc trò chuyện của chính user này — tránh dò UUID người khác. */
  private async requireOwnSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
    }
    return session;
  }

  private async getOrCreateLatestSession(userId: string) {
    const existing = await this.prisma.chatSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.chatSession.create({ data: { userId } });
  }

  async getMessages(userId: string, sessionId: string) {
    await this.requireOwnSession(userId, sessionId);
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteSession(
    userId: string,
    sessionId: string,
  ): Promise<{ ok: true }> {
    await this.prisma.chatSession.deleteMany({
      where: { id: sessionId, userId },
    });
    return { ok: true };
  }

  async ask(
    userId: string,
    message: string,
    sessionId?: string,
  ): Promise<{ message: string; sessionId: string; action?: AssistantAction }> {
    const session = sessionId
      ? await this.requireOwnSession(userId, sessionId)
      : await this.getOrCreateLatestSession(userId);

    const priorCount = await this.prisma.chatMessage.count({
      where: { sessionId: session.id },
    });
    const { text: replyText, action } = await this.generateReply(
      userId,
      message,
      session.id,
    );
    await this.persistTurn(
      session.id,
      session.title,
      message,
      replyText,
      priorCount,
    );

    return { message: replyText, sessionId: session.id, action };
  }

  /**
   * Bản streaming của `ask()` — dùng SSE (`@Sse()` route ở controller) để
   * đẩy từng đoạn chữ về ngay khi Gemini sinh ra, thay vì bắt người dùng
   * đợi toàn bộ câu trả lời xong mới thấy gì. Chỉ thử 1 model đầu tiên
   * trong `CHAT_MODELS` (streaming dở giữa chừng thì không "đổi model giữa
   * dòng" được) — nếu model đó lỗi trước khi kịp trả chữ nào thì rơi về
   * `generateWithFallback()` (không streaming) để vẫn có câu trả lời.
   */
  askStream(
    userId: string,
    message: string,
    sessionId?: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          if (!this.genAI) {
            subscriber.next({
              data: JSON.stringify({
                delta:
                  'Trợ lý AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
              }),
            });
            subscriber.next({ data: JSON.stringify({ done: true }) });
            subscriber.complete();
            return;
          }

          const session = sessionId
            ? await this.requireOwnSession(userId, sessionId)
            : await this.getOrCreateLatestSession(userId);
          const priorCount = await this.prisma.chatMessage.count({
            where: { sessionId: session.id },
          });
          let contents = await this.buildPromptContents(
            userId,
            message,
            session.id,
          );

          let fullText = '';
          let action: AssistantAction | undefined;
          try {
            // Tối đa 2 lượt: lượt 1 có tool (model có thể chọn gọi tool thay vì
            // trả lời ngay), lượt 2 (chỉ chạy nếu lượt 1 gọi tool) KHÔNG đưa
            // tool nữa để ép model trả lời bằng text dựa trên kết quả tool —
            // tránh vòng lặp gọi tool vô hạn.
            for (let round = 0; round < 2; round++) {
              const stream = await this.genAI.models.generateContentStream({
                model: this.CHAT_MODELS[0],
                contents,
                config: round === 0 ? { tools: TOOLS } : undefined,
              });
              let calledTool: FunctionCall | null = null;
              for await (const chunk of stream) {
                const calls = chunk.functionCalls;
                if (calls && calls.length > 0 && !calledTool) {
                  calledTool = calls[0];
                  continue;
                }
                const delta = chunk.text ?? '';
                if (!delta) continue;
                fullText += delta;
                subscriber.next({ data: JSON.stringify({ delta }) });
              }
              if (!calledTool) break;
              const { resultForModel, action: toolAction } =
                await this.executeTool(calledTool);
              if (toolAction) action = toolAction;
              contents = [
                ...contents,
                { role: 'model', parts: [{ functionCall: calledTool }] },
                {
                  role: 'user',
                  parts: [
                    {
                      functionResponse: {
                        name: calledTool.name,
                        response: { result: resultForModel },
                      },
                    },
                  ],
                },
              ];
            }
          } catch (err) {
            this.logger.warn(
              `[Assistant] streaming model lỗi, rơi về generateWithFallback: ${(err as Error).message}`,
            );
          }
          if (!fullText) {
            const fallback = await this.generateWithFallback(contents);
            fullText = fallback ?? this.pickRandom(this.OVERLOADED_REPLIES);
            subscriber.next({ data: JSON.stringify({ delta: fullText }) });
          }

          await this.persistTurn(
            session.id,
            session.title,
            message,
            fullText,
            priorCount,
          );
          subscriber.next({
            data: JSON.stringify({ done: true, sessionId: session.id, action }),
          });
          subscriber.complete();
        } catch (err) {
          this.lastError = (err as Error).message;
          this.logger.error(
            `[Assistant] askStream lỗi: ${(err as Error).message}`,
          );
          subscriber.next({
            data: JSON.stringify({ delta: 'Có lỗi xảy ra, thử lại nhé.' }),
          });
          subscriber.next({ data: JSON.stringify({ done: true }) });
          subscriber.complete();
        }
      })();
    });
  }

  /** Lưu 2 lượt (người hỏi + model) + cập nhật session — dùng chung cho cả
   * ask() và askStream(). */
  private async persistTurn(
    sessionId: string,
    existingTitle: string | null,
    userMessage: string,
    replyText: string,
    priorCount: number,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { sessionId, role: ChatRole.USER, text: userMessage },
      }),
      this.prisma.chatMessage.create({
        data: { sessionId, role: ChatRole.MODEL, text: replyText },
      }),
      this.prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
          // Đặt tên cuộc trò chuyện từ tin nhắn đầu tiên, không đổi lại sau đó.
          ...(priorCount === 0 && !existingTitle
            ? {
                title:
                  userMessage.length > this.TITLE_MAX_LEN
                    ? `${userMessage.slice(0, this.TITLE_MAX_LEN).trim()}…`
                    : userMessage,
              }
            : {}),
        },
      }),
    ]);
  }

  private async generateReply(
    userId: string,
    message: string,
    sessionId: string,
  ): Promise<{ text: string; action?: AssistantAction }> {
    if (!this.genAI) {
      return {
        text: 'Trợ lý AI chưa được bật — cần cấu hình GEMINI_API_KEY trước đã.',
      };
    }

    let contents: Content[];
    try {
      contents = await this.buildPromptContents(userId, message, sessionId);
    } catch (err) {
      this.lastError = (err as Error).message;
      this.logger.error(`[Assistant] ask lỗi: ${(err as Error).message}`);
      return { text: 'Có lỗi xảy ra, thử lại nhé.' };
    }

    try {
      const first = await this.genAI.models.generateContent({
        model: this.CHAT_MODELS[0],
        contents,
        config: { tools: TOOLS },
      });
      const call = first.functionCalls?.[0];
      if (call) {
        const { resultForModel, action } = await this.executeTool(call);
        const followUpContents: Content[] = [
          ...contents,
          { role: 'model', parts: [{ functionCall: call }] },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: { result: resultForModel },
                },
              },
            ],
          },
        ];
        const second = await this.genAI.models.generateContent({
          model: this.CHAT_MODELS[0],
          contents: followUpContents,
        });
        return {
          text: second.text ?? this.pickRandom(this.OVERLOADED_REPLIES),
          action,
        };
      }
      if (first.text) return { text: first.text };
    } catch (err) {
      this.logger.warn(
        `[Assistant] model chính lỗi, rơi về generateWithFallback: ${(err as Error).message}`,
      );
    }

    const reply = await this.generateWithFallback(contents);
    return { text: reply ?? this.pickRandom(this.OVERLOADED_REPLIES) };
  }

  /** Ghép lịch sử hội thoại + RAG (ngữ pháp/FAQ) + tra từ vựng theo Hán tự +
   * dữ kiện cá nhân thành `contents` gửi Gemini — dùng chung cho `ask()`
   * (không streaming) và `askStream()`. */
  private async buildPromptContents(
    userId: string,
    message: string,
    sessionId: string,
  ): Promise<Content[]> {
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
    // `c.text` đã tự mang nhãn nguồn riêng (vd "[Ngữ pháp HSK..." hoặc
    // "[Câu hỏi thường gặp Hanni...") lúc đánh index, không cần bọc thêm.
    const ragContext = relevant.map((c) => c.text).join('\n\n---\n\n');

    // Tra từ điển thẳng theo Hán tự có trong câu hỏi — không tốn quota
    // embedding (chỉ query DB), nhưng cho ground truth chính xác tuyệt đối
    // về cấp HSK/nghĩa của TỪ CỤ THỂ đang được hỏi, thay vì để model đoán.
    const words = await this.searchWordsByChineseTerms(message);
    const wordContext = words.map((w) => this.wordMetadataBlock(w)).join('\n');

    const context = [ragContext, wordContext]
      .filter(Boolean)
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
- Nếu người dùng muốn MỞ/XEM/VÀO 1 trang hay 1 video cụ thể (kể cả khi nói chung chung, không rõ chi tiết), PHẢI gọi tool tương ứng (navigate_to_page hoặc open_video) NGAY LẬP TỨC trong lượt này — TUYỆT ĐỐI không hỏi lại để làm rõ trước, không chỉ mô tả bằng lời. Bạn KHÔNG tự chuyển trang được, chỉ đưa ra đường dẫn để hệ thống hiện nút bấm — sau khi gọi tool, mời người dùng bấm nút đó ("bấm vào đây để..."), TUYỆT ĐỐI không nói là bạn đã mở/chuyển trang giúp họ rồi.
- Trả lời câu hỏi tự nhiên, đầy đủ bằng kiến thức tiếng Trung của bạn — không cần bó buộc trong các đoạn trích ở trên.
- Nếu có điểm ngữ pháp/từ vựng Hanni liên quan (xem phần trên), có thể nhắc khéo tới trong app như gợi ý đọc thêm.
- QUAN TRỌNG: nếu phần trên có mục "Từ vựng Hanni" cho đúng chữ Hán đang được hỏi, PHẢI dùng đúng cấp HSK/nghĩa ở đó — tuyệt đối không tự đoán cấp HSK hay nghĩa khác cho từ đó.
- Chỉ nói một điểm ngữ pháp/từ vựng "có trong Hanni" nếu nó thực sự xuất hiện ở phần trích trên — nếu dùng kiến thức chung ngoài phần đó, đừng ngụ ý là đã có sẵn trong app.
- Dùng thông tin học tập cá nhân ở trên khi câu hỏi liên quan tới tiến độ/streak/nên học gì hôm nay của chính người dùng.
- Nếu người dùng đang học dở 1 bài hoặc xem dở 1 video (xem phần trên), chủ động nhắc tên bài/video đó khi trả lời các câu hỏi kiểu "hôm nay học gì", "tiếp theo nên làm gì", "gợi ý cho tôi" — thay vì chỉ nói chung chung.
- Nếu thấy xu hướng luyện tập 7 ngày qua lệch hẳn về 1 kỹ năng (chỉ nghe hoặc chỉ phát âm, không ôn từ vựng...), có thể khéo léo gợi ý cân bằng thêm kỹ năng còn thiếu khi phù hợp với câu hỏi.
- Trả lời ngắn gọn, có thể dùng gạch đầu dòng và **in đậm** cho từ khoá quan trọng.
      `.trim();

    return this.buildContents(prompt, history);
  }

  /** Ground truth về tiến độ CHÍNH người đang hỏi — tránh AI đoán bừa streak/số từ.
   * Gồm cả bài/video đang học dở + xu hướng luyện tập gần đây, để AI chủ động
   * dẫn dắt đúng ("tiếp tục bài X", "video Y đang xem dở") thay vì trả lời
   * chung chung — đây là điểm khác biệt so với chatbot tra cứu thuần. */
  private async buildUserFactsBlock(userId: string): Promise<string> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const [
      streak,
      learnedCount,
      dueCount,
      onboarding,
      currentLesson,
      currentVideo,
      recentReviewCount,
      practiceBySkill,
    ] = await Promise.all([
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
      this.prisma.userLessonProgress.findFirst({
        where: { userId, completedAt: null, startedAt: { not: null } },
        orderBy: { updatedAt: 'desc' },
        select: {
          learnedWords: true,
          totalWords: true,
          lesson: { select: { title: true, hskLevel: true } },
        },
      }),
      this.prisma.userVideoProgress.findFirst({
        where: { userId, completedAt: null, linesRead: { gt: 0 } },
        orderBy: { updatedAt: 'desc' },
        select: { video: { select: { title: true } } },
      }),
      this.prisma.reviewLog.count({
        where: { userId, reviewedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.practiceAttempt.groupBy({
        by: ['skill'],
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        _count: true,
      }),
    ]);

    const lines = [
      `Chuỗi ngày học liên tiếp hiện tại: ${streak?.currentStreak ?? 0} ngày (kỷ lục: ${streak?.longestStreak ?? 0} ngày).`,
      `Số từ đã thuộc (ôn đều, chu kỳ ≥ ${LEARNED_INTERVAL_DAYS} ngày): ${learnedCount} từ.`,
      `Số từ đang đến hạn ôn: ${dueCount} từ.`,
    ];
    if (currentLesson) {
      lines.push(
        `Đang học dở bài "${currentLesson.lesson.title}" (HSK ${currentLesson.lesson.hskLevel}) — đã học ${currentLesson.learnedWords}/${currentLesson.totalWords} từ trong bài.`,
      );
    }
    if (currentVideo) {
      lines.push(`Đang xem dở video "${currentVideo.video.title}".`);
    }
    const trend = [
      recentReviewCount > 0 ? `${recentReviewCount} lượt ôn từ vựng` : null,
      ...practiceBySkill.map(
        (p) =>
          `${p._count} lượt luyện ${p.skill === 'LISTENING' ? 'nghe' : 'phát âm'}`,
      ),
    ].filter(Boolean);
    if (trend.length) {
      lines.push(`Trong 7 ngày qua: ${trend.join(', ')}.`);
    }
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

  // Tra thẳng theo Hán tự xuất hiện trong câu hỏi — không cần embedding, chỉ
  // 1 query DB — cho ground truth chính xác tuyệt đối (cấp HSK/nghĩa) cho
  // đúng từ đang được hỏi, tránh model đoán bừa như đã từng xảy ra ở
  // tech-books-backend khi không có bước tra cứu trực tiếp này.
  private async searchWordsByChineseTerms(message: string, limit = 6) {
    const terms = [...new Set(message.match(/[一-鿿]+/g) ?? [])].slice(0, 5);
    if (!terms.length) return [];
    return this.prisma.word.findMany({
      where: {
        OR: terms.flatMap((t) => [
          { simplified: { contains: t } },
          { traditional: { contains: t } },
        ]),
      },
      select: {
        simplified: true,
        traditional: true,
        pinyin: true,
        hskLevel: true,
        meaningVi: true,
        meaningEn: true,
      },
      take: limit,
    });
  }

  private wordMetadataBlock(w: {
    simplified: string;
    traditional: string | null;
    pinyin: string;
    hskLevel: number;
    meaningVi: string | null;
    meaningEn: string | null;
  }): string {
    const hanzi =
      w.traditional && w.traditional !== w.simplified
        ? `${w.simplified}/${w.traditional}`
        : w.simplified;
    const meaning = w.meaningVi ?? w.meaningEn ?? '(nghĩa đang cập nhật)';
    return `[Từ vựng Hanni - "${hanzi}"] pinyin: ${w.pinyin}, cấp HSK: ${w.hskLevel}, nghĩa: ${meaning}`;
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
  ): Content[] {
    const historyContents: Content[] = history.map((h) => ({
      role: h.role === ChatRole.USER ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));
    return [...historyContents, { role: 'user', parts: [{ text: prompt }] }];
  }

  /** Tra cứu/tính đường dẫn cho 1 lệnh gọi tool của model — cả 2 tool đều
   * chỉ ĐỌC dữ liệu, không đổi gì trong DB, nên gọi thẳng không cần xác
   * nhận trước. `resultForModel` luôn nhắc model đừng tự nhận là đã mở
   * trang/video giúp người dùng — chỉ hệ thống hiện nút bấm, người dùng
   * tự bấm mới thật sự điều hướng (tránh lặp lại lỗi "nói đã mở nhưng
   * chưa mở" mà chatbot thuần text hay mắc phải). */
  private async executeTool(
    call: FunctionCall,
  ): Promise<{ resultForModel: string; action?: AssistantAction }> {
    const args = call.args ?? {};

    if (call.name === 'navigate_to_page') {
      const page = typeof args.page === 'string' ? args.page : '';
      const path = PAGE_PATHS[page];
      if (!path) {
        return { resultForModel: `Không có trang "${page}" trong app Hanni.` };
      }
      const level = typeof args.level === 'number' ? args.level : undefined;
      const finalPath =
        level && (page === 'learn' || page === 'vocabulary')
          ? `${path}?level=${level}`
          : path;
      return {
        resultForModel: `Đã có đường dẫn tới trang "${PAGE_LABELS_VI[page]}" — hệ thống sẽ hiện nút bấm ngay dưới câu trả lời để người dùng tự mở. Mời người dùng bấm nút đó, ĐỪNG nói là bạn đã tự mở/chuyển trang giúp họ.`,
        action: {
          type: 'navigate',
          path: finalPath,
          label: PAGE_LABELS_VI[page],
        },
      };
    }

    if (call.name === 'open_video') {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query)
        return { resultForModel: 'Chưa rõ tên/chủ đề video cần tìm.' };
      const video = await this.prisma.video.findFirst({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { titleZh: { contains: query } },
          ],
        },
        select: { id: true, title: true },
      });
      if (!video) {
        return {
          resultForModel: `Không tìm thấy video nào khớp với "${query}" trong thư viện Hanni — trả lời thật là chưa tìm thấy, đừng nói là đã mở video nào.`,
        };
      }
      return {
        resultForModel: `Đã tìm thấy video "${video.title}" — hệ thống sẽ hiện nút bấm ngay dưới câu trả lời để người dùng tự mở. Mời người dùng bấm nút đó, ĐỪNG nói là bạn đã tự mở video giúp họ.`,
        action: {
          type: 'navigate',
          path: `/watch/${video.id}`,
          label: video.title,
        },
      };
    }

    return { resultForModel: 'Không rõ hành động được yêu cầu.' };
  }

  private async generateWithFallback(
    contents: Content[],
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
