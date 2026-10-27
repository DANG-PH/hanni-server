import type { DataSource } from 'typeorm';
import { HskLevel } from '../entities';
import { HskBand } from '../enums';

/**
 * 9 cấp HSK 3.0 theo đại cương thi chính thức 11/2025 (hiệu lực 07/2026). Số từ luỹ kế:
 *   300 / 500 / 1000 / 2000 / 3600 / 5400 / 11000 (7-9 tính gộp).
 * (Bản nháp 2021 — GF0025-2021 — khác đáng kể: 500 / 1272 / 2245 / 3245 / 4316 / 5456 / 11092; Hanni không dùng.)
 * Chữ Hán (nhận biết / viết tay) theo bản 2025.
 */

interface LevelSeed {
  level: number;
  band: HskBand;
  nameVi: string;
  newWords2025: number;
  cumulative2025: number;
  readingChars: number | null;
  writingChars: number | null;
}

export const HSK_LEVELS: LevelSeed[] = [
  {
    level: 1,
    band: HskBand.ELEMENTARY,
    nameVi: 'Sơ cấp 1',
    newWords2025: 300,
    cumulative2025: 300,
    readingChars: 246,
    writingChars: 101,
  },
  {
    level: 2,
    band: HskBand.ELEMENTARY,
    nameVi: 'Sơ cấp 2',
    newWords2025: 200,
    cumulative2025: 500,
    readingChars: 374,
    writingChars: 101,
  },
  {
    level: 3,
    band: HskBand.ELEMENTARY,
    nameVi: 'Sơ cấp 3',
    newWords2025: 500,
    cumulative2025: 1000,
    readingChars: 660,
    writingChars: 252,
  },
  {
    level: 4,
    band: HskBand.INTERMEDIATE,
    nameVi: 'Trung cấp 4',
    newWords2025: 1000,
    cumulative2025: 2000,
    readingChars: 1104,
    writingChars: 403,
  },
  {
    level: 5,
    band: HskBand.INTERMEDIATE,
    nameVi: 'Trung cấp 5',
    newWords2025: 1600,
    cumulative2025: 3600,
    readingChars: 1538,
    writingChars: 554,
  },
  {
    level: 6,
    band: HskBand.INTERMEDIATE,
    nameVi: 'Trung cấp 6',
    newWords2025: 1800,
    cumulative2025: 5400,
    readingChars: 1954,
    writingChars: 705,
  },
  {
    level: 7,
    band: HskBand.ADVANCED,
    nameVi: 'Cao cấp 7 (7–9 thi chung)',
    newWords2025: 5600,
    cumulative2025: 11000,
    readingChars: 3109,
    writingChars: 1208,
  },
  {
    level: 8,
    band: HskBand.ADVANCED,
    nameVi: 'Cao cấp 8 (7–9 thi chung)',
    newWords2025: 0,
    cumulative2025: 11000,
    readingChars: null,
    writingChars: null,
  },
  {
    level: 9,
    band: HskBand.ADVANCED,
    nameVi: 'Cao cấp 9 (7–9 thi chung)',
    newWords2025: 0,
    cumulative2025: 11000,
    readingChars: null,
    writingChars: null,
  },
];

export async function seedHskLevels(db: DataSource): Promise<void> {
  await db.getRepository(HskLevel).upsert(HSK_LEVELS, ['level']);
  console.log(`  ✓ ${HSK_LEVELS.length} cấp HSK`);
}
