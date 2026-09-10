import { HskBand, PrismaClient, SkillType } from '@prisma/client';

/**
 * 9 cấp HSK 3.0. Lưu CẢ chỉ tiêu bản nháp 2021 (GF0025-2021) và bản đại cương
 * thi chính thức 11/2025 (hiệu lực 07/2026) — hai bộ số khác nhau đáng kể.
 *
 * Số liệu (luỹ kế):
 *   2021:  500 / 1272 / 2245 / 3245 / 4316 / 5456 / 11092
 *   2025:  300 /  500 / 1000 / 2000 / 3600 / 5400 / 11000  (7-9 tính gộp)
 *
 * Chữ Hán (nhận biết / viết tay) theo bản 2025.
 * Kỹ năng: 听说读写 cho mọi cấp; 译 (dịch) thêm từ bậc Trung cấp trở lên.
 */

const ELEMENTARY_SKILLS = [
  SkillType.LISTENING,
  SkillType.SPEAKING,
  SkillType.READING,
  SkillType.WRITING,
];
const HIGHER_SKILLS = [...ELEMENTARY_SKILLS, SkillType.TRANSLATION];

interface LevelSeed {
  level: number;
  band: HskBand;
  isSharedBand: boolean;
  nameVi: string;
  newWords2021: number;
  cumulative2021: number;
  newWords2025: number;
  cumulative2025: number;
  readingChars: number | null;
  writingChars: number | null;
  skills: SkillType[];
}

export const HSK_LEVELS: LevelSeed[] = [
  { level: 1, band: HskBand.ELEMENTARY, isSharedBand: false, nameVi: 'Sơ cấp 1', newWords2021: 500, cumulative2021: 500, newWords2025: 300, cumulative2025: 300, readingChars: 246, writingChars: 101, skills: ELEMENTARY_SKILLS },
  { level: 2, band: HskBand.ELEMENTARY, isSharedBand: false, nameVi: 'Sơ cấp 2', newWords2021: 772, cumulative2021: 1272, newWords2025: 200, cumulative2025: 500, readingChars: 374, writingChars: 101, skills: ELEMENTARY_SKILLS },
  { level: 3, band: HskBand.ELEMENTARY, isSharedBand: false, nameVi: 'Sơ cấp 3', newWords2021: 973, cumulative2021: 2245, newWords2025: 500, cumulative2025: 1000, readingChars: 660, writingChars: 252, skills: ELEMENTARY_SKILLS },
  { level: 4, band: HskBand.INTERMEDIATE, isSharedBand: false, nameVi: 'Trung cấp 4', newWords2021: 1000, cumulative2021: 3245, newWords2025: 1000, cumulative2025: 2000, readingChars: 1104, writingChars: 403, skills: HIGHER_SKILLS },
  { level: 5, band: HskBand.INTERMEDIATE, isSharedBand: false, nameVi: 'Trung cấp 5', newWords2021: 1071, cumulative2021: 4316, newWords2025: 1600, cumulative2025: 3600, readingChars: 1538, writingChars: 554, skills: HIGHER_SKILLS },
  { level: 6, band: HskBand.INTERMEDIATE, isSharedBand: false, nameVi: 'Trung cấp 6', newWords2021: 1140, cumulative2021: 5456, newWords2025: 1800, cumulative2025: 5400, readingChars: 1954, writingChars: 705, skills: HIGHER_SKILLS },
  { level: 7, band: HskBand.ADVANCED, isSharedBand: true, nameVi: 'Cao cấp 7 (7–9 thi chung)', newWords2021: 5636, cumulative2021: 11092, newWords2025: 5600, cumulative2025: 11000, readingChars: 3109, writingChars: 1208, skills: HIGHER_SKILLS },
  { level: 8, band: HskBand.ADVANCED, isSharedBand: true, nameVi: 'Cao cấp 8 (7–9 thi chung)', newWords2021: 0, cumulative2021: 11092, newWords2025: 0, cumulative2025: 11000, readingChars: null, writingChars: null, skills: HIGHER_SKILLS },
  { level: 9, band: HskBand.ADVANCED, isSharedBand: true, nameVi: 'Cao cấp 9 (7–9 thi chung)', newWords2021: 0, cumulative2021: 11092, newWords2025: 0, cumulative2025: 11000, readingChars: null, writingChars: null, skills: HIGHER_SKILLS },
];

export async function seedHskLevels(prisma: PrismaClient): Promise<void> {
  for (const lv of HSK_LEVELS) {
    await prisma.hskLevel.upsert({
      where: { level: lv.level },
      create: lv,
      update: lv,
    });
  }
  console.log(`  ✓ ${HSK_LEVELS.length} cấp HSK`);
}
