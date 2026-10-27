import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import {
  GrammarPoint,
  HskLevel,
  Lesson,
  UserLessonProgress,
  UserSettings,
  UserWordProgress,
  Word,
} from '../../database/entities';
import { SrsState } from '../../database/enums';
import { relatedGrammarForWords } from '../grammar/grammar-match.util';
import { LEARNED_INTERVAL_DAYS } from '../srs/srs.constants';

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
  constructor(
    @InjectRepository(UserSettings)
    private readonly settings: Repository<UserSettings>,
    @InjectRepository(HskLevel) private readonly levels: Repository<HskLevel>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(UserWordProgress)
    private readonly wordProgress: Repository<UserWordProgress>,
    @InjectRepository(UserLessonProgress)
    private readonly lessonProgress: Repository<UserLessonProgress>,
    @InjectRepository(GrammarPoint)
    private readonly grammarPoints: Repository<GrammarPoint>,
  ) {}

  /** Cấp học "hiện tại": cấp người học ĐÃ CHỌN (`UserSettings.courseLevel`),
   * chưa chọn thì cấp thấp nhất chưa thuộc hết. Trước đây chỉ có cách suy
   * ra, nên người muốn học HSK1 không có chỗ nào để nói "tôi học HSK1" — mọi
   * trang tự đoán theo cách riêng (lỗi thật user báo: flashcard nhảy HSK4). */
  async currentLevel(userId: string): Promise<number> {
    const settings = await this.settings.findOne({
      where: { userId },
      select: { userId: true, courseLevel: true },
    });
    if (settings?.courseLevel) return settings.courseLevel;
    const [totals, learned] = await Promise.all([
      // Số từ mỗi cấp, cấp thấp trước.
      this.words
        .createQueryBuilder('word')
        .select('word.hskLevel', 'hskLevel')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('word.hskLevel')
        .orderBy('word.hskLevel', 'ASC')
        .getRawMany<{ hskLevel: number; count: number }>(),
      // Số từ đã thuộc mỗi cấp của người này.
      this.wordProgress
        .createQueryBuilder('p')
        .select('p.hskLevel', 'hskLevel')
        .addSelect('COUNT(*)::int', 'count')
        .where({ userId, learnedAt: Not(IsNull()) })
        .groupBy('p.hskLevel')
        .getRawMany<{ hskLevel: number; count: number }>(),
    ]);
    const learnedBy = new Map(learned.map((l) => [l.hskLevel, l.count]));
    for (const t of totals) {
      if ((learnedBy.get(t.hskLevel) ?? 0) < t.count) return t.hskLevel;
    }
    return totals[0]?.hskLevel ?? 1;
  }

  async firstLesson(level: number) {
    const lesson = await this.lessons.findOne({
      where: { hskLevel: Math.min(level, 7) },
      order: { orderIndex: 'ASC' },
      select: { id: true, title: true, hskLevel: true, orderIndex: true },
    });
    if (!lesson) throw new NotFoundException('Cấp này chưa có bài học');
    return lesson;
  }

  /** `userId` null = khách: xem lộ trình của cấp (mặc định HSK 1), chưa có tiến độ. */
  async path(userId: string | null, level?: number) {
    const lvl = level ?? (userId ? await this.currentLevel(userId) : 1);

    const [levelInfo, lessons, progressRows, levelSummary] = await Promise.all([
      this.levels.findOneBy({ level: lvl }),
      this.lessons.find({
        where: { hskLevel: lvl },
        order: { orderIndex: 'ASC' },
      }),
      userId
        ? this.wordProgress.find({
            where: { userId, hskLevel: lvl },
            relations: { word: true },
            select: {
              id: true,
              wordId: true,
              state: true,
              learnedAt: true,
              intervalDays: true,
              dueAt: true,
              isSuspended: true,
              word: { id: true, lessonId: true },
            },
          })
        : [],
      // Số bài mỗi cấp (để biết cấp nào có bài).
      this.lessons
        .createQueryBuilder('lesson')
        .select('lesson.hskLevel', 'hskLevel')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('lesson.hskLevel')
        .getRawMany<{ hskLevel: number; count: number }>(),
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
    const firstWords = await this.words.find({
      where: {
        lessonId: In(lessons.map((l) => l.id)),
        lessonOrder: LessThanOrEqual(3),
      },
      select: { id: true, lessonId: true, simplified: true, lessonOrder: true },
      order: { lessonOrder: 'ASC' },
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
      levelSummary.map((s) => [s.hskLevel, s.count]),
    );

    return {
      level: lvl,
      levelName: levelInfo.nameVi,
      band: levelInfo.band,
      totalLessons: nodes.length,
      completedLessons: nodes.filter((n) => n.status === 'COMPLETED').length,
      // Bài ĐẦU TIÊN chưa xong theo đúng thứ tự — không ưu tiên bài "đang
      // dở": vài từ lẻ (lưu từ video, hay lỗi flashcard cũ nhét vào) là đủ
      // đánh dấu bài 7 "đang học", và nút "Học tiếp" nhảy cóc khỏi bài 1.
      currentLessonId: nodes.find((n) => n.status !== 'COMPLETED')?.id ?? null,
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
    const lessons = await this.lessons.find({
      where: { hskLevel: level },
      order: { orderIndex: 'ASC' },
      select: { id: true, title: true, orderIndex: true, hskLevel: true },
    });
    if (lessons.length === 0) return null;

    const progress = await this.lessonProgress.find({
      where: { userId, lessonId: In(lessons.map((l) => l.id)) },
      select: { id: true, lessonId: true, completedAt: true },
    });
    const doneIds = new Set(
      progress.filter((p) => p.completedAt).map((p) => p.lessonId),
    );
    const startedIds = new Set(
      progress.filter((p) => !p.completedAt).map((p) => p.lessonId),
    );

    // Bài đầu tiên chưa xong theo thứ tự — cùng luật với `path()`.
    const lesson =
      lessons.find((l) => !doneIds.has(l.id)) ?? lessons[lessons.length - 1];

    return {
      ...lesson,
      inProgress: startedIds.has(lesson.id),
      totalLessons: lessons.length,
      completedLessons: doneIds.size,
    };
  }

  async lesson(userId: string | null, lessonId: string) {
    const lesson = await this.lessons.findOneBy({ id: lessonId });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const words = await this.words.find({
      where: { lessonId },
      relations: { examples: true },
      order: { lessonOrder: 'ASC', examples: { orderIndex: 'ASC' } },
    });
    const progress = userId
      ? await this.wordProgress.find({
          where: { userId, wordId: In(words.map((w) => w.id)) },
          select: {
            id: true,
            wordId: true,
            state: true,
            learnedAt: true,
            dueAt: true,
          },
        })
      : [];
    const pBy = new Map(progress.map((p) => [p.wordId, p] as const));

    const grammarPoints = await this.grammarPoints.find({
      // chỉ lấy mục ĐÃ có giải thích thật — mục "đại cương" rút gọn (explanationVi
      // rỗng) không mở rộng được trên trang /grammar, gợi ý sẽ dẫn tới ngõ cụt.
      where: { hskLevel: lesson.hskLevel, explanationVi: Not('') },
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
