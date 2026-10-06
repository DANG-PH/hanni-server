import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StreakService } from '../gamification/streak/streak.service';
import {
  PAPERS,
  paperMeta,
  publicPaper,
  reviewOf,
  scorePaper,
  type PinyinOverrides,
} from './mock-exam.content';
import type { AnswerValue, MockPaper } from './mock-exam.types';

/** Từ điển chỉ cần tới cấp này để sửa pinyin/gắn ghi âm cho lời thoại đề. */
const DICTIONARY_MAX_LEVEL = 6;

@Injectable()
export class MockExamsService {
  /** Đề là nội dung tĩnh trong code — dựng 1 lần (pinyin + ghi âm từ từ
   * điển) rồi dùng lại cho mọi lượt gọi tới khi khởi động lại. */
  private built?: Promise<{
    overrides: PinyinOverrides;
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
        select: { simplified: true, pinyin: true, audioUrl: true },
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
      const papers = new Map(
        PAPERS.map((p) => [p.slug, publicPaper(p, overrides, audioByWord)]),
      );
      return { overrides, papers };
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
    const { overrides } = await this.build();
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
      review: reviewOf(paper, overrides).map((r) => ({
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
}
