import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { MockExamAttempt, Word } from '../../database/entities';
import { StreakService } from '../gamification/streak/streak.service';
import {
  isCorrect,
  numberItems,
  PAPERS,
  paperMeta,
  partStats,
  practiceParts,
  practiceSets,
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
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(MockExamAttempt)
    private readonly attempts: Repository<MockExamAttempt>,
    private readonly streak: StreakService,
  ) {}

  private build() {
    this.built ??= (async () => {
      const words = await this.words.find({
        where: { hskLevel: LessThanOrEqual(DICTIONARY_MAX_LEVEL) },
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
      ? await this.attempts
          .createQueryBuilder('attempt')
          .select('attempt.examSlug', 'examSlug')
          .addSelect('MAX(attempt.score)', 'best')
          .addSelect('COUNT(*)::int', 'attempts')
          .where('attempt.userId = :userId', { userId })
          .groupBy('attempt.examSlug')
          .getRawMany<{ examSlug: string; best: number; attempts: number }>()
      : [];
    const bySlug = new Map(mine.map((m) => [m.examSlug, m]));
    return PAPERS.map((p) => {
      const m = bySlug.get(p.slug);
      return {
        ...paperMeta(p),
        ...(m ? { best: m.best, attempts: m.attempts } : {}),
      };
    });
  }

  async paper(slug: string) {
    this.find(slug);
    const { papers } = await this.build();
    return papers.get(slug)!;
  }

  /** Chấm điểm phía server (đề gửi xuống không kèm đáp án). Khách vẫn được
   * chấm + chữa bài; chỉ người đăng nhập mới lưu lịch sử và giữ chuỗi ngày.
   *
   * LUỒNG "NỘP BÀI" (POST /mock-exams/:slug/submit — client components/mock-exam/exam-runner.tsx, nút Nộp bài hoặc
   * hết giờ): đề nằm trong code (papers/hsk1.ts … hsk4.ts, KHÔNG ở DB) → scorePaper() (mock-exam.content.ts) so từng
   * câu bằng isCorrect(): chọn đáp án so số, sắp xếp câu bỏ dấu câu rồi so (nhận cả `alternatives`), đặt câu HSK 4
   * chấm tối thiểu acceptableSentence() → điểm mỗi phần quy về 100, đạt khi tổng ≥ 60% → đã đăng nhập thì lưu
   * MockExamAttempt + giữ chuỗi ngày → trả chữa bài reviewOf(): đáp án, lời thoại có pinyin, bản dịch, từ vựng từng
   * câu kèm âm Hán Việt. Đáp án KHÔNG bao giờ gửi xuống trước khi nộp (publicPaper() lọc bỏ — có test). */
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
      const { identifiers } = await this.attempts.insert({
        userId,
        examSlug: slug,
        hskLevel: paper.level,
        score: result.score,
        maxScore: result.maxScore,
        passed: result.passed,
        sectionScores: result.sections,
        answers,
        durationSec: durationSec ?? null,
      });
      attemptId = identifiers[0].id as string;
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
    return this.attempts.find({
      where: { userId },
      order: { createdAt: 'DESC' },
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

  /** Các bộ "luyện từng dạng bài" (cấp × phần đề), kèm số câu. */
  practiceList() {
    return practiceSets();
  }

  /** 1 bộ luyện: các phần đề cùng dạng của mọi đề cùng cấp, đúng định dạng đề
   * gửi xuống khi làm bài (KHÔNG kèm đáp án — chấm từng câu ở `practiceCheck`). */
  async practiceSet(slug: string) {
    const found = practiceParts(slug);
    const meta = practiceSets().find((s) => s.slug === slug);
    if (!found || !meta) throw new NotFoundException('Không có dạng bài này');
    const { papers } = await this.build();
    return {
      ...meta,
      showPinyin: papers.get(found.refs[0].paper.slug)!.showPinyin,
      groups: found.refs.map(({ paper, sectionIndex, partIndex }) => ({
        examSlug: paper.slug,
        examTitle: paper.title,
        part: papers.get(paper.slug)!.sections[sectionIndex].parts[partIndex],
      })),
    };
  }

  /** Chấm + chữa ngay 1 câu khi luyện từng dạng (không lưu lượt làm, không
   * tính vào lịch sử/điểm mạnh yếu — đó là của lượt làm cả đề). */
  async practiceCheck(examSlug: string, no: number, answer: unknown) {
    const paper = this.find(examSlug);
    const n = numberItems(paper).find((x) => x.no === no);
    if (!n) throw new NotFoundException('Không có câu này');
    const { overrides, vocab } = await this.build();
    const review = reviewOf(paper, overrides, vocab).find((r) => r.no === no)!;
    return { ...review, given: answer ?? null, correct: isCorrect(n, answer) };
  }

  /** Điểm mạnh/yếu theo từng phần đề, cộng dồn mọi lượt đã làm. */
  async analysis(userId: string) {
    const attempts = await this.attempts.find({
      where: { userId },
      select: { id: true, examSlug: true, answers: true },
    });
    return { attempts: attempts.length, parts: partStats(attempts) };
  }
}
