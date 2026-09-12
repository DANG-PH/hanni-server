import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PracticeSkill } from '@prisma/client';
import { AppEvent, type PracticeAttemptedPayload } from '../../events/events';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { RecordAttemptDto } from './dto/practice.dto';

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async record(userId: string, dto: RecordAttemptDto) {
    const word = await this.prisma.word.findUnique({
      where: { id: dto.wordId },
      select: { id: true },
    });
    if (!word) throw new NotFoundException('Không tìm thấy từ');

    const isCorrect =
      dto.skill === PracticeSkill.LISTENING ? (dto.isCorrect ?? null) : null;
    const attempt = await this.prisma.practiceAttempt.create({
      data: { userId, wordId: dto.wordId, skill: dto.skill, isCorrect },
    });

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
    const rows = await this.prisma.practiceAttempt.findMany({
      where: { userId, skill },
      select: { wordId: true, isCorrect: true },
    });
    const totalAttempts = rows.length;
    const distinctWordsCount = new Set(rows.map((r) => r.wordId)).size;
    const graded = rows.filter((r) => r.isCorrect !== null);
    const correctCount =
      skill === PracticeSkill.LISTENING
        ? graded.filter((r) => r.isCorrect).length
        : null;
    const accuracyPct =
      skill === PracticeSkill.LISTENING && graded.length > 0
        ? Math.round(((correctCount as number) / graded.length) * 100)
        : null;
    return { totalAttempts, distinctWordsCount, correctCount, accuracyPct };
  }
}
