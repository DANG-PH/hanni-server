import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StreakService } from '../gamification/streak/streak.service';
import {
  PAPERS,
  paperMeta,
  partStats,
  publicPaper,
  reviewOf,
  scorePaper,
  type PinyinOverrides,
  type Vocab,
} from './mock-exam.content';
import type { AnswerValue, MockPaper } from './mock-exam.types';

/** Từ điển chỉ cần tới cấp này để sửa pinyin/gắn ghi âm cho lời thoại đề. */
const DICTIONARY_MAX_LEVEL = 6;
/** Nghĩa chú thích khi chữa bài: tối đa 2 nét nghĩa đầu cho gọn. */
const shortMeaning = (vi: string) =>
  vi
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('; ');

@Injectable()
export class MockExamsService {
  /** Đề là nội dung tĩnh trong code — dựng 1 lần (pinyin + ghi âm từ từ
   * điển) rồi dùng lại cho mọi lượt gọi tới khi khởi động lại. */
  private built?: Promise<{
    overrides: PinyinOverrides;
    vocab: Vocab;
    papers: Map<string, ReturnType<typeof publicPaper>>;
  }>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
  ) {}

  private build() {
    this.built ??= (async () => {
      const words = await this.prisma.word.findMany({
        where: { hskLevel: { lte: DICTIONARY_MAX_LEVEL } },
        select: {
          id: true,
          simplified: true,
          pinyin: true,
          audioUrl: true,
          hanViet: true,
          meaningVi: true,
        },
      });
      const readings = new Map<string, Set<string>>();
      const audioByWord = new Map<string, string>();
      for (const w of words) {
        readings.set(
          w.simplified,
          (readings.get(w.simplified) ?? new Set()).add(w.pinyin),
        );
        if (w.audioUrl && !audioByWord.has(w.simplified))
          audioByWord.set(w.simplified, w.audioUrl);
      }
      const overrides: PinyinOverrides = new Map();
      for (const [simplified, set] of readings) {
        const chars = Array.from(simplified);
        if (set.size !== 1) continue;
        const syllables = [...set][0].split(/\s+/).filter(Boolean);
        if (syllables.length === chars.length)
          overrides.set(simplified, syllables);
      }
      const entries = new Map<string, number>();
      for (const w of words)
        entries.set(w.simplified, (entries.get(w.simplified) ?? 0) + 1);
      const vocab: Vocab = new Map();
      for (const w of words)
        if (entries.get(w.simplified) === 1 && w.meaningVi)
          vocab.set(w.simplified, {
            id: w.id,
            zh: w.simplified,
            pinyin: w.pinyin,
            hanViet: w.hanViet,
            vi: shortMeaning(w.meaningVi),
          });
      const papers = new Map(
        PAPERS.map((p) => [p.slug, publicPaper(p, overrides, audioByWord)]),
      );
      return { overrides, vocab, papers };
    })().catch((err: unknown) => {
      this.built = undefined;
      throw err;
    });
    return this.built;
  }

  private find(slug: string): MockPaper {
    const paper = PAPERS.find((p) => p.slug === slug);
    if (!paper) throw new NotFoundException('Không tìm thấy đề thi này');
    return paper;
  }

  /** Danh sách đề + (đã đăng nhập) điểm cao nhất và số lần làm mỗi đề. */
  async list(userId?: string) {
    const mine = userId
      ? await this.prisma.mockExamAttempt.groupBy({
          by: ['examSlug'],
          where: { userId },
          _max: { score: true },
          _count: { _all: true },
        })
      : [];
    const bySlug = new Map(mine.map((m) => [m.examSlug, m]));
    return PAPERS.map((p) => {
      const m = bySlug.get(p.slug);
      return {
        ...paperMeta(p),
        ...(m ? { best: m._max.score, attempts: m._count._all } : {}),
      };
    });
  }

  async paper(slug: string) {
    this.find(slug);
    const { papers } = await this.build();
    return papers.get(slug)!;
  }

  /** Chấm điểm phía server (đề gửi xuống không kèm đáp án). Khách vẫn được
   * chấm + chữa bài; chỉ người đăng nhập mới lưu lịch sử và giữ chuỗi ngày. */
  async submit(
    slug: string,
    answers: (AnswerValue | null)[],
    durationSec: number | undefined,
    userId?: string,
  ) {
    const paper = this.find(slug);
    const { overrides, vocab } = await this.build();
    const result = scorePaper(paper, answers);
    let attemptId: string | null = null;
    if (userId) {
      const attempt = await this.prisma.mockExamAttempt.create({
        data: {
          userId,
          examSlug: slug,
          hskLevel: paper.level,
          score: result.score,
          maxScore: result.maxScore,
          passed: result.passed,
          sectionScores: result.sections as unknown as Prisma.InputJsonValue,
          answers,
          durationSec: durationSec ?? null,
        },
        select: { id: true },
      });
      attemptId = attempt.id;
      await this.streak.recordActivity(userId, new Date(), {
        minutesStudied: (durationSec ?? 0) / 60,
      });
    }
    const correctByNo = new Map(result.results.map((r) => [r.no, r]));
    return {
      attemptId,
      score: result.score,
      maxScore: result.maxScore,
      passScore: result.passScore,
      passed: result.passed,
      sections: result.sections,
      review: reviewOf(paper, overrides, vocab).map((r) => ({
        ...r,
        given: correctByNo.get(r.no)?.given ?? null,
        correct: correctByNo.get(r.no)?.correct ?? false,
      })),
    };
  }

  history(userId: string) {
    return this.prisma.mockExamAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        examSlug: true,
        hskLevel: true,
        score: true,
        maxScore: true,
        passed: true,
        sectionScores: true,
        durationSec: true,
        createdAt: true,
      },
    });
  }

  /** Điểm mạnh/yếu theo từng phần đề, cộng dồn mọi lượt đã làm. */
  async analysis(userId: string) {
    const attempts = await this.prisma.mockExamAttempt.findMany({
      where: { userId },
      select: { examSlug: true, answers: true },
    });
    return { attempts: attempts.length, parts: partStats(attempts) };
  }
}
