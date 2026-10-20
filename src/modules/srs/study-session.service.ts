import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudySession } from '../../database/entities';
import { StudySource } from '../../database/enums';
import { insertAndReturn } from '../../database/repository.util';
import { AppEvent, type SessionEndedPayload } from '../../events/events';

@Injectable()
export class StudySessionService {
  constructor(
    @InjectRepository(StudySession)
    private readonly sessions: Repository<StudySession>,
    private readonly events: EventEmitter2,
  ) {}

  start(userId: string, source: StudySource) {
    return insertAndReturn(this.sessions, {
      userId,
      source: source ?? StudySource.REVIEW,
    });
  }

  async end(userId: string, sessionId: string) {
    const session = await this.sessions.findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');
    if (session.userId !== userId) throw new ForbiddenException();
    if (session.endedAt) return session;

    await this.sessions.update(sessionId, { endedAt: new Date() });
    const ended = await this.sessions.findOneByOrFail({ id: sessionId });

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
