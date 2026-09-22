import { Injectable, NotFoundException } from '@nestjs/common';
import { SrsState } from '@prisma/client';
import { relatedGrammarForWords } from '../grammar/grammar-match.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

const LEARNED_INTERVAL_DAYS = 21;

export type LessonStatus = 'COMPLETED' | 'IN_PROGRESS' | 'AVAILABLE' | 'LOCKED';

export interface LessonNode {
  id: string;
  orderIndex: number;
  title: string;
  wordCount: number;
  learnedWords: number;
  startedWords: number;
  dueWords: number;
  status: LessonStatus;
  previewWords: string[];
}

@Injectable()
export class LearnService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cấp học "hiện tại" = cấp thấp nhất chưa thuộc hết. */
  private async currentLevel(userId: string): Promise<number> {
    const [totals, learned] = await Promise.all([
      this.prisma.word.groupBy({
        by: ['hskLevel'],
        _count: true,
        orderBy: { hskLevel: 'asc' },
      }),
      this.prisma.userWordProgress.groupBy({
        by: ['hskLevel'],
        where: { userId, learnedAt: { not: null } },
        _count: true,
      }),
    ]);
    const learnedBy = new Map(learned.map((l) => [l.hskLevel, l._count]));
    for (const t of totals) {
      if ((learnedBy.get(t.hskLevel) ?? 0) < t._count) return t.hskLevel;
    }
    return totals[0]?.hskLevel ?? 1;
  }

  async path(userId: string, level?: number) {
    const lvl = level ?? (await this.currentLevel(userId));

    const [levelInfo, lessons, progressRows, levelSummary] = await Promise.all([
      this.prisma.hskLevel.findUnique({ where: { level: lvl } }),
      this.prisma.lesson.findMany({
        where: { hskLevel: lvl },
        orderBy: { orderIndex: 'asc' },
      }),
      this.prisma.userWordProgress.findMany({
        where: { userId, hskLevel: lvl },
        select: {
          wordId: true,
          state: true,
          learnedAt: true,
          intervalDays: true,
          dueAt: true,
          isSuspended: true,
          word: { select: { lessonId: true } },
        },
      }),
      this.prisma.lesson.groupBy({ by: ['hskLevel'], _count: true }),
    ]);
    if (!levelInfo) throw new NotFoundException('Cấp HSK không hợp lệ');

    const now = Date.now();
    const perLesson = new Map<
      string,
      { learned: number; started: number; due: number }
    >();
    for (const p of progressRows) {
      const lid = p.word.lessonId;
      if (!lid) continue;
      const agg = perLesson.get(lid) ?? { learned: 0, started: 0, due: 0 };
      agg.started += 1;
      const isLearned =
        p.learnedAt != null ||
        (p.state === SrsState.REVIEW &&
          p.intervalDays >= LEARNED_INTERVAL_DAYS);
      if (isLearned) agg.learned += 1;
      if (
        !p.isSuspended &&
        p.state !== SrsState.NEW &&
        p.dueAt &&
        p.dueAt.getTime() <= now
      )
        agg.due += 1;
      perLesson.set(lid, agg);
    }

    // preview: 3 từ đầu mỗi bài
    const firstWords = await this.prisma.word.findMany({
      where: {
        lessonId: { in: lessons.map((l) => l.id) },
        lessonOrder: { lte: 3 },
      },
      select: { lessonId: true, simplified: true, lessonOrder: true },
      orderBy: { lessonOrder: 'asc' },
    });
    const previewBy = new Map<string, string[]>();
    for (const w of firstWords) {
      if (!w.lessonId) continue;
      const arr = previewBy.get(w.lessonId) ?? [];
      arr.push(w.simplified);
      previewBy.set(w.lessonId, arr);
    }

    const nodes: LessonNode[] = lessons.map((l) => {
      const agg = perLesson.get(l.id) ?? { learned: 0, started: 0, due: 0 };
      // "xong bài" = đã học qua tất cả từ trong bài ít nhất 1 lần (SRS lo phần ôn lại).
      const completed = l.wordCount > 0 && agg.started >= l.wordCount;
      // KHÔNG khoá bài nào nữa (bỏ 2026-09-22). Trước đây bài sau chỉ mở khi
      // bài trước học HẾT mọi từ, nên người mới mở lộ trình ra thấy 1 bài mở
      // và 26 ổ khoá, không kèm lời giải thích nào — vừa nản vừa khó hiểu.
      //
      // Quan trọng hơn: các bài ở đây chia theo CHỦ ĐỀ (Chào hỏi, Gia đình,
      // Đồ ăn, Thời tiết...) chứ không phải theo độ khó tăng dần, nên bắt
      // học xong "Số đếm" mới được học "Đồ ăn" là vô lý. Research về lộ
      // trình học cũng cho thấy giới hạn nhân tạo là nguồn khó chịu chính,
      // còn người học tiến bộ tốt hơn khi được chọn thứ tự.
      //
      // Định hướng vẫn giữ qua `currentLessonId` (bài nên học tiếp) để người
      // mới không mất phương hướng — gợi ý thay vì cấm.
      const status: LessonStatus = completed
        ? 'COMPLETED'
        : agg.started > 0
          ? 'IN_PROGRESS'
          : 'AVAILABLE';
      return {
        id: l.id,
        orderIndex: l.orderIndex,
        title: l.title,
        wordCount: l.wordCount,
        learnedWords: agg.learned,
        startedWords: agg.started,
        dueWords: agg.due,
        status,
        previewWords: previewBy.get(l.id) ?? [],
      };
    });

    const totalLessonsBy = new Map(
      levelSummary.map((s) => [s.hskLevel, s._count]),
    );

    return {
      level: lvl,
      levelName: levelInfo.nameVi,
      band: levelInfo.band,
      totalLessons: nodes.length,
      completedLessons: nodes.filter((n) => n.status === 'COMPLETED').length,
      currentLessonId:
        nodes.find((n) => n.status === 'IN_PROGRESS')?.id ??
        nodes.find((n) => n.status === 'AVAILABLE')?.id ??
        null,
      lessons: nodes,
      levels: [...totalLessonsBy.keys()].sort((a, b) => a - b),
    };
  }

  /** Bài học ĐANG HỌC DỞ (hoặc bài tiếp theo nên học) — gọn nhẹ, chỉ trả
   * đúng thông tin cần để các trang luyện tập biết "người này đang học bài
   * nào".
   *
   * Lý do có hàm này: `/listening`, `/pronunciation`, quiz, minigame trước
   * đây mỗi trang tự chọn từ theo cấp HSK rồi lấy ngẫu nhiên/theo trang, nên
   * người đang học bài "Gia đình" vào luyện nghe lại gặp toàn từ khác — các
   * phần rời rạc, không theo lộ trình lẫn chủ đề. Giờ mọi trang hỏi CHUNG
   * một chỗ này để mặc định luyện đúng bài đang học.
   *
   * `path()` đã tính `currentLessonId` nhưng phải dựng cả lộ trình (mọi bài
   * + tiến độ từng bài) mới ra — quá nặng cho việc chỉ cần 1 dòng. */
  async currentLesson(userId: string) {
    const level = await this.currentLevel(userId);
    const lessons = await this.prisma.lesson.findMany({
      where: { hskLevel: level },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, orderIndex: true, hskLevel: true },
    });
    if (lessons.length === 0) return null;

    const progress = await this.prisma.userLessonProgress.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
      select: { lessonId: true, completedAt: true },
    });
    const doneIds = new Set(
      progress.filter((p) => p.completedAt).map((p) => p.lessonId),
    );
    const startedIds = new Set(
      progress.filter((p) => !p.completedAt).map((p) => p.lessonId),
    );

    // Ưu tiên bài đang dở, sau đó tới bài chưa học đầu tiên.
    const lesson =
      lessons.find((l) => startedIds.has(l.id)) ??
      lessons.find((l) => !doneIds.has(l.id)) ??
      lessons[lessons.length - 1];

    return {
      ...lesson,
      inProgress: startedIds.has(lesson.id),
      totalLessons: lessons.length,
      completedLessons: doneIds.size,
    };
  }

  async lesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const words = await this.prisma.word.findMany({
      where: { lessonId },
      orderBy: { lessonOrder: 'asc' },
      include: { examples: { orderBy: { orderIndex: 'asc' } } },
    });
    const progress = await this.prisma.userWordProgress.findMany({
      where: { userId, wordId: { in: words.map((w) => w.id) } },
      select: { wordId: true, state: true, learnedAt: true, dueAt: true },
    });
    const pBy = new Map(progress.map((p) => [p.wordId, p]));

    const grammarPoints = await this.prisma.grammarPoint.findMany({
      // chỉ lấy mục ĐÃ có giải thích thật — mục "đại cương" rút gọn (explanationVi
      // rỗng) không mở rộng được trên trang /grammar, gợi ý sẽ dẫn tới ngõ cụt.
      where: { hskLevel: lesson.hskLevel, NOT: { explanationVi: '' } },
      select: {
        slug: true,
        hskLevel: true,
        titleVi: true,
        titleZh: true,
        summaryVi: true,
      },
    });
    const relatedGrammar = relatedGrammarForWords(
      grammarPoints,
      words.map((w) => w.simplified),
    );

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        hskLevel: lesson.hskLevel,
        wordCount: lesson.wordCount,
      },
      words: words.map((w) => ({
        ...w,
        progressState: pBy.get(w.id)?.state ?? 'NEW',
        learnedAt: pBy.get(w.id)?.learnedAt ?? null,
      })),
      relatedGrammar,
    };
  }
}
