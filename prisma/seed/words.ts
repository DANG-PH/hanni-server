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
  examples?: {
    zh: string;
    pinyin?: string | null;
    vi?: string | null;
    en?: string | null;
    orderIndex?: number;
    source?: string | null;
  }[];
}

const SEED_FILE = join(__dirname, '..', '..', 'data', 'processed', 'words.seed.json');

function normPos(values: string[] | undefined): WordPos[] {
  if (!values) return [];
  return values
    .map((v) => v.toUpperCase())
    .filter((v): v is WordPos => v in WordPos) as WordPos[];
}

function normStatus(v: string | undefined): TranslationStatus {
  const up = (v ?? '').toUpperCase();
  return up in TranslationStatus
    ? (up as TranslationStatus)
    : TranslationStatus.MISSING;
}

export async function seedWords(prisma: PrismaClient): Promise<void> {
  let raw: WordSeedRecord[];
  try {
    raw = JSON.parse(readFileSync(SEED_FILE, 'utf8')) as WordSeedRecord[];
  } catch {
    console.log('  ⚠ Chưa có data/processed/words.seed.json — bỏ qua seed từ vựng.');
    console.log('    Chạy: npm run data:build-words  (xem scripts/import/README.md)');
    return;
  }

  if (process.env.SEED_RESET === 'true') {
    await prisma.word.deleteMany({});
    console.log('  (SEED_RESET) đã xoá toàn bộ Word cũ');
  }

  let count = 0;
  for (const rec of raw) {
    const data = {
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
    } satisfies Prisma.WordUncheckedCreateInput;

    const word = await prisma.word.upsert({
      where: {
        simplified_pinyinNumeric: {
          simplified: data.simplified,
          pinyinNumeric: data.pinyinNumeric,
        },
      },
      create: data,
      update: data,
    });

    if (rec.examples?.length) {
      await prisma.wordExample.deleteMany({ where: { wordId: word.id } });
      await prisma.wordExample.createMany({
        data: rec.examples.map((e, i) => ({
          wordId: word.id,
          zh: e.zh,
          pinyin: e.pinyin ?? null,
          vi: e.vi ?? null,
          en: e.en ?? null,
          orderIndex: e.orderIndex ?? i,
          source: e.source ?? rec.source ?? null,
        })),
      });
    }
    count += 1;
  }

  console.log(`  ✓ ${count} từ vựng (+ ví dụ) từ words.seed.json`);
}
