import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PracticeAttempt, Word } from '../../database/entities';
import { PracticeSkill } from '../../database/enums';
import { AppEvent, type PracticeAttemptedPayload } from '../../events/events';
import type { RecordAttemptDto } from './dto/practice.dto';

@Injectable()
export class PracticeService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(PracticeAttempt)
    private readonly attempts: Repository<PracticeAttempt>,
    private readonly events: EventEmitter2,
  ) {}

  async record(userId: string, dto: RecordAttemptDto) {
    if (!(await this.words.existsBy({ id: dto.wordId })))
      throw new NotFoundException('Không tìm thấy từ');

    const attempt = await this.attempts.save(
      this.attempts.create({
        userId,
        wordId: dto.wordId,
        skill: dto.skill,
        isCorrect: dto.isCorrect ?? null,
      }),
    );

    const payload: PracticeAttemptedPayload = {
      userId,
      wordId: dto.wordId,
      skill: dto.skill,
      isCorrect: attempt.isCorrect,
      at: attempt.createdAt.toISOString(),
    };
    this.events.emit(AppEvent.PracticeAttempted, payload);

    return { ok: true };
  }

  async stats(userId: string, skill: PracticeSkill) {
    const rows = await this.attempts.find({
      where: { userId, skill },
      select: { id: true, wordId: true, isCorrect: true },
    });
    const totalAttempts = rows.length;
    const distinctWordsCount = new Set(rows.map((r) => r.wordId)).size;
    const graded = rows.filter((r) => r.isCorrect !== null);
    const correctCount =
      graded.length > 0 ? graded.filter((r) => r.isCorrect).length : null;
    const accuracyPct =
      graded.length > 0
        ? Math.round(((correctCount as number) / graded.length) * 100)
        : null;
    return { totalAttempts, distinctWordsCount, correctCount, accuracyPct };
  }
}
