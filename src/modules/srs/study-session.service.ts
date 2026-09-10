import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudySource } from '@prisma/client';
import { AppEvent, type SessionEndedPayload } from '../../events/events';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class StudySessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  start(userId: string, source: StudySource) {
    return this.prisma.studySession.create({
      data: { userId, source: source ?? StudySource.REVIEW },
    });
  }

  async end(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');
    if (session.userId !== userId) throw new ForbiddenException();
    if (session.endedAt) return session;

    const ended = await this.prisma.studySession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    const payload: SessionEndedPayload = {
      userId,
      studySessionId: ended.id,
      cardsReviewed: ended.cardsReviewed,
      cardsCorrect: ended.cardsCorrect,
    };
    this.events.emit(AppEvent.SessionEnded, payload);
    return ended;
  }
}
