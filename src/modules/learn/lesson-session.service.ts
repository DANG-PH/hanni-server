import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import {
  Lesson,
  UserStreak,
  UserWordProgress,
  Word,
  WordExample,
} from '../../database/entities';
import { ReviewRating } from '../../database/enums';
import { StreakService } from '../gamification/streak/streak.service';
import { toneHintsOf } from '../hanviet/tone-rule.util';
import { ReviewService } from '../srs/review.service';
import type { CompleteLessonDto } from './dto/lesson-session.dto';
import { buildLessonSession } from './lesson-session.util';

/** Số từ cùng cấp (thông dụng nhất, ngoài bài) làm kho phương án nhiễu. */
const DISTRACTOR_POOL = 80;
/** Số câu ví dụ mỗi từ đưa vào phiên học (bước điền từ vào câu). */
const EXAMPLES_PER_WORD = 2;

@Injectable()
export class LessonSessionService {
  constructor(
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(WordExample)
    private readonly examples: Repository<WordExample>,
    @InjectRepository(UserWordProgress)
    private readonly progress: Repository<UserWordProgress>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    private readonly reviews: ReviewService,
    private readonly streak: StreakService,
  ) {}

  /** Công khai (không cần đăng nhập): khách vào thẳng bài 1 từ trang chủ, học
   * xong mới mời tạo tài khoản — nội dung bài vốn là dữ liệu mở. */
  async session(lessonId: string) {
    const lesson = await this.lessons.findOne({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        hskLevel: true,
        orderIndex: true,
        wordCount: true,
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const [lessonWords, distractors, totalLessons] = await Promise.all([
      this.words.find({
        where: { lessonId },
        order: { lessonOrder: 'ASC' },
        select: {
          id: true,
          simplified: true,
          pinyin: true,
          pinyinNumeric: true,
          hanViet: true,
          meaningVi: true,
          meaningEn: true,
          audioUrl: true,
          mnemonicVi: true,
          pos: true,
        },
      }),
      this.words.find({
        where: {
          hskLevel: lesson.hskLevel,
          lessonId: Not(lessonId), // từ của các bài khác (SQL `<>` bỏ qua cả từ chưa gán bài)
          meaningVi: Not(IsNull()),
        },
        select: {
          id: true,
          simplified: true,
          meaningVi: true,
          pinyin: true,
          pos: true,
        },
        order: { frequencyRank: 'ASC' },
        take: DISTRACTOR_POOL,
      }),
      this.lessons.countBy({ hskLevel: lesson.hskLevel }),
    ]);
    const examplesOf = await this.examplesByWord(lessonWords.map((w) => w.id));
    const words = lessonWords.map((w) => ({
      ...w,
      examples: examplesOf.get(w.id) ?? [],
    }));
    // Khách không gọi được `complete` (cần đăng nhập) nên bài kế tiếp trả
    // sẵn ở đây — học xong bài 1 vẫn đi tiếp được mà không bị chặn ở cửa đăng ký.
    const nextLesson = await this.nextLesson(lesson);

    return {
      lesson: { ...lesson, totalLessons },
      nextLesson,
      words: words.map((w) => ({ ...w, toneHints: toneHintsOf(w) })),
      steps: buildLessonSession(words, distractors),
    };
  }

  /** Tối đa `EXAMPLES_PER_WORD` câu ví dụ mỗi từ (chỉ chữ Hán, pinyin, nghĩa) — 1 truy vấn cho cả bài. */
  private async examplesByWord(wordIds: string[]) {
    const rows = await this.examples.find({
      where: { wordId: In(wordIds) },
      order: { orderIndex: 'ASC' },
      select: { id: true, wordId: true, zh: true, pinyin: true, vi: true },
    });
    const byWord = new Map<
      string,
      { zh: string; pinyin: string | null; vi: string | null }[]
    >();
    for (const r of rows) {
      const list = byWord.get(r.wordId) ?? [];
      if (list.length < EXAMPLES_PER_WORD)
        list.push({ zh: r.zh, pinyin: r.pinyin, vi: r.vi });
      byWord.set(r.wordId, list);
    }
    return byWord;
  }

  private nextLesson(lesson: { hskLevel: number; orderIndex: number }) {
    return this.lessons.findOne({
      where: {
        hskLevel: lesson.hskLevel,
        orderIndex: MoreThan(lesson.orderIndex),
      },
      order: { orderIndex: 'ASC' },
      select: { id: true, title: true, orderIndex: true },
    });
  }

  /** Ghi kết quả 1 phiên học: từ CHƯA có tiến độ được đưa vào SRS qua đúng
   * `review()` (nên chuỗi ngày, nhiệm vụ, giải đấu, huy hiệu tự chạy theo như
   * ôn flashcard), mức đánh giá suy từ số lần sai trong phiên. Từ đã có tiến
   * độ (học lại bài) KHÔNG đụng lịch ôn — học lại là luyện thêm, không phải
   * một lượt ôn đến hạn. */
  async complete(userId: string, lessonId: string, dto: CompleteLessonDto) {
    const lesson = await this.lessons.findOne({
      where: { id: lessonId },
      select: { id: true, hskLevel: true, orderIndex: true },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const words = await this.words.find({
      where: { lessonId },
      select: { id: true },
    });
    const existing = await this.progress.find({
      where: { userId, wordId: In(words.map((w) => w.id)) },
      select: { id: true, wordId: true },
    });
    const started = new Set(existing.map((e) => e.wordId));
    const mistakesBy = new Map(dto.results.map((r) => [r.wordId, r.mistakes]));

    let newWords = 0;
    for (const w of words) {
      if (started.has(w.id)) continue;
      const mistakes = mistakesBy.get(w.id) ?? 0;
      const rating =
        mistakes === 0
          ? ReviewRating.GOOD
          : mistakes === 1
            ? ReviewRating.HARD
            : ReviewRating.AGAIN;
      await this.reviews.review(userId, { wordId: w.id, rating });
      newWords += 1;
    }

    // Phút học + giữ chuỗi ngày cả khi chỉ học lại bài cũ (không có từ mới
    // nào đi qua review() để tự ghi nhận hoạt động).
    await this.streak.recordActivity(userId, new Date(), {
      minutesStudied: (dto.durationMs ?? 0) / 60_000,
    });

    const [nextLesson, streak] = await Promise.all([
      this.nextLesson(lesson),
      this.streaks.findOne({
        where: { userId },
        select: { userId: true, currentStreak: true, longestStreak: true },
      }),
    ]);

    const total = dto.results.length;
    const perfect = dto.results.filter((r) => r.mistakes === 0).length;
    return {
      lessonId,
      newWords,
      accuracy: total ? perfect / total : 1,
      currentStreak: streak?.currentStreak ?? 0,
      nextLesson,
    };
  }
}
