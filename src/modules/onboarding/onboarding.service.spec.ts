import type { FindOperator, Repository } from 'typeorm';
import type {
  Lesson,
  OnboardingProfile,
  UserSettings,
} from '../../database/entities';
import type { SubmitOnboardingDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

/** Bài học giả: cấp 1–3, mỗi bài 10 từ (đủ để kiểm tra phép đếm theo khoảng cấp). */
const LESSONS_PER_LEVEL: Record<number, number> = { 1: 27, 2: 19, 3: 43 };

/** Repository bài học giả: bài đầu của cấp + đếm bài/từ trong khoảng cấp (`Between`). */
function fakeLessons() {
  let range: [number, number] = [0, 0];
  const qb = {
    select: () => qb,
    addSelect: () => qb,
    where: (w: { hskLevel: FindOperator<number> }) => {
      range = w.hskLevel.value as unknown as [number, number];
      return qb;
    },
    getRawOne: () => {
      let count = 0;
      for (let lv = range[0]; lv <= range[1]; lv++)
        count += LESSONS_PER_LEVEL[lv] ?? 0;
      return Promise.resolve({ lessons: count, words: count * 10 });
    },
  };
  return {
    findOne: jest.fn(({ where }: { where: { hskLevel: number } }) =>
      Promise.resolve({
        id: `l${where.hskLevel}`,
        title: `Bài đầu HSK ${where.hskLevel}`,
      }),
    ),
    createQueryBuilder: () => qb,
  } as unknown as Repository<Lesson>;
}

const base: SubmitOnboardingDto = {
  hasStudiedBefore: false,
  goal: 'TRAVEL',
  plansToTakeExam: false,
};

describe('OnboardingService.preview', () => {
  const service = new OnboardingService(
    {} as Repository<OnboardingProfile>,
    {} as Repository<UserSettings>,
    fakeLessons(),
  );

  it('chưa học → bắt đầu bài 1 HSK 1, không có kế hoạch thi', async () => {
    const { plan, recommendedLevel } = await service.preview({
      ...base,
      dailyMinutes: 10,
    });
    expect(recommendedLevel).toBe(1);
    expect(plan).toEqual({
      startLevel: 1,
      firstLesson: { id: 'l1', title: 'Bài đầu HSK 1' },
      dailyMinutes: 10,
      exam: null,
    });
  });

  it('biết một chút, chưa chắc cấp → chưa có cấp/bài bắt đầu, chưa đếm bài tới kỳ thi', async () => {
    const { plan, recommendationVi } = await service.preview({
      ...base,
      hasStudiedBefore: true,
      goal: 'EXAM',
      plansToTakeExam: true,
      targetLevel: 3,
    });
    expect(plan.startLevel).toBeNull();
    expect(plan.firstLesson).toBeNull();
    expect(plan.exam).toEqual({
      level: 3,
      lessons: null,
      words: null,
      weeksLeft: null,
    });
    expect(recommendationVi).toContain('kiểm tra trình độ');
  });

  it('đang học HSK 2, thi HSK 3 sau ~26 tuần → đếm bài HSK 2 + 3 và số tuần', async () => {
    const date = new Date(Date.now() + 26 * 7 * 86_400_000 - 3_600_000);
    const { plan, recommendationVi } = await service.preview({
      ...base,
      hasStudiedBefore: true,
      selfAssessedLevel: 2,
      goal: 'EXAM',
      plansToTakeExam: true,
      targetLevel: 3,
      targetDate: date.toISOString(),
    });
    expect(plan.startLevel).toBe(2);
    expect(plan.exam).toEqual({
      level: 3,
      lessons: 62,
      words: 620,
      weeksLeft: 26,
    });
    expect(recommendationVi).toContain('62 bài');
    expect(recommendationVi).toContain('khoảng 3 bài mỗi tuần');
  });

  it('đã ở trên cấp thi → 0 bài, gợi ý làm đề thi thử', async () => {
    const { plan, recommendationVi } = await service.preview({
      ...base,
      hasStudiedBefore: true,
      selfAssessedLevel: 3,
      goal: 'EXAM',
      plansToTakeExam: true,
      targetLevel: 2,
    });
    expect(plan.exam?.lessons).toBe(0);
    expect(recommendationVi).toContain('đề thi thử');
  });

  it('HSK 8/9 gộp vào cấp 7 (dữ liệu bài học gộp HSK 7–9)', async () => {
    const { plan } = await service.preview({
      ...base,
      hasStudiedBefore: true,
      selfAssessedLevel: 9,
    });
    expect(plan.startLevel).toBe(7);
  });
});
