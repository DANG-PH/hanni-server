import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewRating } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StreakService } from '../gamification/streak/streak.service';
import { toneHintsOf } from '../hanviet/tone-rule.util';
import { ReviewService } from '../srs/review.service';
import type { CompleteLessonDto } from './dto/lesson-session.dto';
import { buildLessonSession } from './lesson-session.util';

/** Số từ cùng cấp (thông dụng nhất, ngoài bài) làm kho phương án nhiễu. */
const DISTRACTOR_POOL = 80;

@Injectable()
export class LessonSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewService,
    private readonly streak: StreakService,
  ) {}

  /** Công khai (không cần đăng nhập): khách vào thẳng bài 1 từ trang chủ, học
   * xong mới mời tạo tài khoản — nội dung bài vốn là dữ liệu mở. */
  async session(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
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

    const [words, distractors, totalLessons] = await Promise.all([
      this.prisma.word.findMany({
        where: { lessonId },
        orderBy: { lessonOrder: 'asc' },
        select: {
          id: true,
          simplified: true,
          pinyin: true,
          pinyinNumeric: true,
          hanViet: true,
          meaningVi: true,
          meaningEn: true,
          audioUrl: true,
          imageUrl: true,
          examples: {
            orderBy: { orderIndex: 'asc' },
            take: 2,
            select: { zh: true, pinyin: true, vi: true },
          },
        },
      }),
      this.prisma.word.findMany({
        where: {
          hskLevel: lesson.hskLevel,
          lessonId: { not: lessonId },
          meaningVi: { not: null },
        },
        select: { simplified: true, meaningVi: true },
        orderBy: { frequencyRank: 'asc' },
        take: DISTRACTOR_POOL,
      }),
      this.prisma.lesson.count({ where: { hskLevel: lesson.hskLevel } }),
    ]);
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

  private nextLesson(lesson: { hskLevel: number; orderIndex: number }) {
    return this.prisma.lesson.findFirst({
      where: {
        hskLevel: lesson.hskLevel,
        orderIndex: { gt: lesson.orderIndex },
      },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, orderIndex: true },
    });
  }

  /** Ghi kết quả 1 phiên học: từ CHƯA có tiến độ được đưa vào SRS qua đúng
   * `review()` (nên chuỗi ngày, nhiệm vụ, giải đấu, huy hiệu tự chạy theo như
   * ôn flashcard), mức đánh giá suy từ số lần sai trong phiên. Từ đã có tiến
   * độ (học lại bài) KHÔNG đụng lịch ôn — học lại là luyện thêm, không phải
   * một lượt ôn đến hạn. */
  async complete(userId: string, lessonId: string, dto: CompleteLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, hskLevel: true, orderIndex: true },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const words = await this.prisma.word.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const existing = await this.prisma.userWordProgress.findMany({
      where: { userId, wordId: { in: words.map((w) => w.id) } },
      select: { wordId: true },
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
      this.prisma.userStreak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true },
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
