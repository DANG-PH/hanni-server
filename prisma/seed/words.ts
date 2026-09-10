import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PrismaClient,
  TranslationStatus,
  WordPos,
  type Prisma,
} from '@prisma/client';

export interface WordSeedRecord {
  simplified: string;
  traditional?: string | null;
  pinyin: string;
  pinyinNumeric: string;
  hskLevel: number;
  hskBandOnly?: boolean;
  pos?: string[];
  frequencyRank?: number | null;
  radical?: string | null;
  strokeCount?: number | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  translationStatus?: string;
  needsReview?: boolean;
  audioUrl?: string | null;
  source?: string;
  lessonIndex?: number;
  lessonOrder?: number;
  examples?: {
    zh: string;
    pinyin?: string | null;
    vi?: string | null;
    en?: string | null;
    orderIndex?: number;
    source?: string | null;
  }[];
}

export const SEED_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'processed',
  'words.seed.json',
);
const CHUNK = 1000;

export function loadWordSeed(): WordSeedRecord[] | null {
  try {
    return JSON.parse(readFileSync(SEED_FILE, 'utf8')) as WordSeedRecord[];
  } catch {
    return null;
  }
}

function normPos(values: string[] | undefined): WordPos[] {
  if (!values) return [];
  return values
    .map((v) => v.toUpperCase())
    .filter((v): v is WordPos => v in WordPos);
}

function normStatus(v: string | undefined): TranslationStatus {
  const up = (v ?? '').toUpperCase();
  return up in TranslationStatus
    ? (up as TranslationStatus)
    : TranslationStatus.MISSING;
}

function toRow(
  rec: WordSeedRecord,
  lessonId: string | null,
): Prisma.WordCreateManyInput {
  return {
    simplified: rec.simplified,
    traditional: rec.traditional ?? null,
    pinyin: rec.pinyin,
    pinyinNumeric: rec.pinyinNumeric.toLowerCase(),
    hskLevel: rec.hskLevel,
    hskBandOnly: rec.hskBandOnly ?? rec.hskLevel >= 7,
    pos: normPos(rec.pos),
    frequencyRank: rec.frequencyRank ?? null,
    radical: rec.radical ?? null,
    strokeCount: rec.strokeCount ?? null,
    meaningVi: rec.meaningVi ?? null,
    meaningEn: rec.meaningEn ?? null,
    translationStatus: normStatus(rec.translationStatus),
    needsReview: rec.needsReview ?? !rec.meaningVi,
    audioUrl: rec.audioUrl ?? null,
    source: rec.source ?? null,
    lessonId,
    lessonOrder: rec.lessonOrder ?? null,
  };
}

export async function seedWords(
  prisma: PrismaClient,
  raw: WordSeedRecord[],
  lessonMap: Map<string, string>,
): Promise<void> {
  const reset = process.env.SEED_RESET === 'true';
  if (reset) {
    await prisma.word.deleteMany({});
    console.log('  (SEED_RESET) đã xoá toàn bộ Word cũ');
  } else if ((await prisma.word.count()) >= raw.length) {
    console.log(`  ✓ Word đã có ${raw.length}+ dòng — bỏ qua (đặt SEED_RESET=true để nạp lại)`);
    return;
  }

  // Nạp hàng loạt (bỏ qua trùng @@unique). Muốn CẬP NHẬT thì dùng SEED_RESET=true.
  const rows = raw.map((r) =>
    toRow(r, lessonMap.get(`${r.hskLevel}:${r.lessonIndex ?? 0}`) ?? null),
  );
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await prisma.word.createMany({
      data: rows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    inserted += res.count;
  }
  console.log(`  ✓ ${inserted}/${raw.length} từ vựng`);

  // Câu ví dụ (chỉ vài từ đã rà tay có ví dụ)
  const withEx = raw.filter((r) => r.examples?.length);
  if (withEx.length) {
    const found = await prisma.word.findMany({
      where: {
        OR: withEx.map((r) => ({
          simplified: r.simplified,
          pinyinNumeric: r.pinyinNumeric.toLowerCase(),
        })),
      },
      select: { id: true, simplified: true, pinyinNumeric: true },
    });
    const idOf = new Map(
      found.map((w) => [`${w.simplified}|${w.pinyinNumeric}`, w.id]),
    );
    const exData: Prisma.WordExampleCreateManyInput[] = [];
    for (const r of withEx) {
      const wid = idOf.get(`${r.simplified}|${r.pinyinNumeric.toLowerCase()}`);
      if (!wid) continue;
      r.examples!.forEach((e, i) =>
        exData.push({
          wordId: wid,
          zh: e.zh,
          pinyin: e.pinyin ?? null,
          vi: e.vi ?? null,
          en: e.en ?? null,
          orderIndex: e.orderIndex ?? i,
          source: e.source ?? r.source ?? null,
        }),
      );
    }
    if (exData.length) {
      await prisma.wordExample.deleteMany({
        where: { wordId: { in: [...idOf.values()] } },
      });
      await prisma.wordExample.createMany({ data: exData });
      console.log(`  ✓ ${exData.length} câu ví dụ`);
    }
  }
}
