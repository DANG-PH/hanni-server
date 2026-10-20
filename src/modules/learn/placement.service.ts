import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Lesson, Word } from '../../database/entities';
import { buildChoiceStep, type ChoicePrompt } from './lesson-session.util';

/** Số câu mỗi cấp; client coi là "qua cấp" khi đúng >= PASS_PER_LEVEL. */
export const PER_LEVEL = 4;
export const PASS_PER_LEVEL = 3;
/** Lấy câu hỏi trong nhóm từ thông dụng nhất mỗi cấp — đo đúng thứ người
 * học cấp đó phải biết, không đánh đố bằng từ hiếm. */
const TOP_PER_LEVEL = 80;
const PROMPTS: ChoicePrompt[] = ['hanzi', 'meaning', 'audio', 'hanzi'];

function sample<T>(items: T[], n: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/**
 * Kiểm tra trình độ đầu vào — Hanpeak, Hanbeego, XieHanzi đều có; Hanni trước
 * đây chỉ có khảo sát TỰ KHAI cấp. Mỗi cấp 4 câu (nghĩa / Hán tự / nghe) lấy
 * từ từ vựng thật của cấp đó; client hỏi dần từ HSK1 lên, sai nhiều ở cấp nào
 * thì dừng và đề xuất học từ cấp đó. Trả đủ đề một lần (client tự chấm, không
 * có thưởng nên không cần giấu đáp án).
 */
@Injectable()
export class PlacementService {
  constructor(
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
  ) {}

  async questions() {
    // Các cấp có bài học.
    const levels = await this.lessons
      .createQueryBuilder('lesson')
      .select('lesson.hskLevel', 'hskLevel')
      .groupBy('lesson.hskLevel')
      .orderBy('lesson.hskLevel', 'ASC')
      .getRawMany<{ hskLevel: number }>();
    // Chữ có nhiều mục (đa âm: 好 hǎo HSK1 / hào HSK5) không đưa vào đề: hỏi
    // "好" ở HSK5 mà đáp án là "thích" thì người biết 好 = tốt bị chấm sai.
    const polyphones = await this.words
      .createQueryBuilder('word')
      .select('word.simplified', 'simplified')
      .groupBy('word.simplified')
      .having('COUNT(*) > 1')
      .getRawMany<{ simplified: string }>();
    const excluded = polyphones.map((p) => p.simplified);
    const words: {
      id: string;
      simplified: string;
      pinyin: string;
      meaningVi: string | null;
      audioUrl: string | null;
    }[] = [];
    const out: {
      level: number;
      steps: ReturnType<typeof buildChoiceStep>[];
    }[] = [];

    for (const { hskLevel } of levels) {
      const top = await this.words.find({
        where: {
          hskLevel,
          simplified: Not(In(excluded)),
          meaningVi: Not(IsNull()),
          audioUrl: Not(IsNull()),
          frequencyRank: Not(IsNull()),
        },
        order: { frequencyRank: 'ASC' },
        take: TOP_PER_LEVEL,
        select: {
          id: true,
          simplified: true,
          pinyin: true,
          meaningVi: true,
          audioUrl: true,
        },
      });
      const targets = sample(top, PER_LEVEL);
      const pool = top.filter((w) => !targets.includes(w));
      const steps = targets
        .map((w, i) =>
          buildChoiceStep(
            { ...w, examples: [] },
            PROMPTS[i % PROMPTS.length],
            pool,
          ),
        )
        .filter((s) => s !== null);
      words.push(...targets);
      out.push({ level: hskLevel, steps });
    }
    return {
      perLevel: PER_LEVEL,
      passPerLevel: PASS_PER_LEVEL,
      words,
      levels: out,
    };
  }
}
