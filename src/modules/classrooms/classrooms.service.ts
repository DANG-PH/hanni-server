import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { isUniqueViolation } from '../../database/db-errors';
import {
  ClassAssignment,
  Classroom,
  ClassroomMember,
  Lesson,
  MockExamAttempt,
  User,
  UserDailyActivity,
  UserLessonProgress,
  UserStreak,
  UserWordProgress,
} from '../../database/entities';
import { insertIfAbsent } from '../../database/repository.util';
import {
  AppEvent,
  type ClassAssignmentCreatedPayload,
} from '../../events/events';
import { PAPERS } from '../mock-exams/mock-exam.content';
import {
  isAssignmentDone,
  makeClassCode,
  MAX_ASSIGNMENTS_PER_CLASS,
  MAX_CLASSES_PER_OWNER,
  MAX_MEMBERS_PER_CLASS,
  normalizeClassCode,
} from './classroom.util';
import type {
  CreateAssignmentDto,
  CreateClassroomDto,
  UpdateClassroomDto,
} from './dto/classroom.dto';

/** Người trong lớp: chỉ tên + ảnh (không lộ email…). */
const person = (u: User) => ({
  id: u.id,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
});

/** 1 bài giao (đã nạp kèm `lesson`). */
type AssignmentRow = ClassAssignment;

/** Bài giao gửi cho client: loại bài + bài học (tên, cấp, số thứ tự) nếu là bài học. */
function assignmentView(a: AssignmentRow) {
  return {
    id: a.id,
    kind: a.kind,
    lessonId: a.lessonId,
    examSlug: a.examSlug,
    dueAt: a.dueAt,
    createdAt: a.createdAt,
    lesson: a.lesson
      ? {
          id: a.lesson.id,
          title: a.lesson.title,
          hskLevel: a.lesson.hskLevel,
          orderIndex: a.lesson.orderIndex,
        }
      : null,
  };
}

interface MemberStats {
  currentStreak: number;
  minutes7d: number;
  daysActive7d: number;
  /** Ngày học gần nhất 'YYYY-MM-DD' (theo ngày học của người đó). */
  lastStudiedOn: string | null;
  lessonsCompleted: number;
  wordsStudied: number;
  examCount: number;
  bestExam: {
    slug: string;
    title: string;
    score: number;
    maxScore: number;
    passed: boolean;
  } | null;
}

interface CompletionFacts {
  completedLessons: Map<string, Set<string>>;
  examAttempts: Map<string, { examSlug: string; createdAt: Date }[]>;
}

/** Tên + đường dẫn bài giao — bài học mở thẳng phiên học, đề mở thẳng phòng thi. */
function describe(a: AssignmentRow) {
  if (a.kind === 'LESSON' && a.lesson)
    return {
      label: `HSK ${a.lesson.hskLevel} · Bài ${a.lesson.orderIndex}: ${a.lesson.title}`,
      href: `/bai-hoc/${a.lesson.id}`,
    };
  const paper = PAPERS.find((p) => p.slug === a.examSlug);
  return {
    label: paper ? `Thi thử ${paper.title}` : `Đề ${a.examSlug}`,
    href: `/thi-thu-hsk/${a.examSlug}`,
  };
}

/**
 * Lớp học cho giáo viên / trung tâm (2026-10-19). Giáo viên tạo lớp → học viên vào
 * bằng mã → giáo viên xem tiến độ từng người (đọc thẳng dữ liệu học có sẵn, không
 * lưu số liệu riêng) và giao bài; học viên thấy bài cần làm ở trang chủ.
 */
@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(Classroom)
    private readonly classrooms: Repository<Classroom>,
    @InjectRepository(ClassroomMember)
    private readonly members: Repository<ClassroomMember>,
    @InjectRepository(ClassAssignment)
    private readonly assignments: Repository<ClassAssignment>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    @InjectRepository(UserDailyActivity)
    private readonly activities: Repository<UserDailyActivity>,
    @InjectRepository(UserLessonProgress)
    private readonly lessonProgress: Repository<UserLessonProgress>,
    @InjectRepository(UserWordProgress)
    private readonly wordProgress: Repository<UserWordProgress>,
    @InjectRepository(MockExamAttempt)
    private readonly mockAttempts: Repository<MockExamAttempt>,
    private readonly events: EventEmitter2,
  ) {}

  async create(ownerId: string, dto: CreateClassroomDto) {
    const owned = await this.classrooms.countBy({ ownerId });
    if (owned >= MAX_CLASSES_PER_OWNER)
      throw new BadRequestException(
        `Mỗi tài khoản tạo tối đa ${MAX_CLASSES_PER_OWNER} lớp`,
      );
    const values = {
      ownerId,
      name: dto.name.trim(),
      hskLevel: dto.hskLevel ?? null,
    };
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeClassCode();
      try {
        const { identifiers } = await this.classrooms.insert({
          ...values,
          code,
        });
        return {
          id: identifiers[0].id as string,
          name: values.name,
          code,
          hskLevel: values.hskLevel,
        };
      } catch (err) {
        // Trùng mã (rất hiếm, 31^6 mã) thì sinh mã khác.
        if (isUniqueViolation(err)) continue;
        throw err;
      }
    }
    throw new ServiceUnavailableException('Chưa tạo được mã lớp, thử lại nhé');
  }

  async mine(userId: string) {
    const [owned, joined, pending] = await Promise.all([
      this.classrooms.find({
        where: { ownerId: userId },
        order: { createdAt: 'DESC' },
      }),
      this.members.find({
        where: { userId },
        order: { joinedAt: 'DESC' },
        relations: { classroom: { owner: true } },
      }),
      this.myAssignments(userId),
    ]);
    const counts = await this.countsPerClass([
      ...owned.map((c) => c.id),
      ...joined.map((m) => m.classroomId),
    ]);
    return {
      owned: owned.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        hskLevel: c.hskLevel,
        createdAt: c.createdAt,
        memberCount: counts.members.get(c.id) ?? 0,
        assignmentCount: counts.assignments.get(c.id) ?? 0,
      })),
      joined: joined.map((m) => ({
        id: m.classroom.id,
        name: m.classroom.name,
        hskLevel: m.classroom.hskLevel,
        teacher: person(m.classroom.owner),
        memberCount: counts.members.get(m.classroomId) ?? 0,
        joinedAt: m.joinedAt,
        pendingCount: pending.filter((p) => p.classId === m.classroom.id)
          .length,
      })),
    };
  }

  /** Trang vào lớp `/lop/[mã]` — khách cũng xem được tên lớp + giáo viên (không lộ danh sách học viên). */
  async preview(rawCode: string, userId: string | null) {
    const c = await this.findByCode(rawCode);
    const isMember = userId
      ? await this.members.existsBy({ classroomId: c.id, userId })
      : false;
    return {
      id: c.id,
      name: c.name,
      hskLevel: c.hskLevel,
      teacher: person(c.owner),
      memberCount: c.memberCount,
      isOwner: c.ownerId === userId,
      isMember,
    };
  }

  async join(rawCode: string, userId: string) {
    const c = await this.findByCode(rawCode);
    if (c.ownerId === userId)
      throw new BadRequestException('Bạn là giáo viên của lớp này rồi');
    if (c.memberCount >= MAX_MEMBERS_PER_CLASS)
      throw new BadRequestException(
        `Lớp đã đủ ${MAX_MEMBERS_PER_CLASS} học viên`,
      );
    // Vào lại lớp đã vào rồi thì không sao (idempotent).
    await insertIfAbsent(this.members, { classroomId: c.id, userId });
    return { id: c.id };
  }

  async leave(classroomId: string, userId: string) {
    await this.members.delete({ classroomId, userId });
    return { ok: true };
  }

  async update(classroomId: string, ownerId: string, dto: UpdateClassroomDto) {
    await this.ownedOrThrow(classroomId, ownerId);
    const changes = {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.hskLevel !== undefined && { hskLevel: dto.hskLevel }),
    };
    if (Object.keys(changes).length)
      await this.classrooms.update(classroomId, changes);
    return this.classrooms.findOneOrFail({
      where: { id: classroomId },
      select: { id: true, name: true, code: true, hskLevel: true },
    });
  }

  async remove(classroomId: string, ownerId: string) {
    await this.ownedOrThrow(classroomId, ownerId);
    // Học viên + bài giao của lớp xoá theo khoá ngoại ON DELETE CASCADE.
    await this.classrooms.delete(classroomId);
    return { ok: true };
  }

  async removeMember(classroomId: string, ownerId: string, memberId: string) {
    await this.ownedOrThrow(classroomId, ownerId);
    await this.members.delete({ classroomId, userId: memberId });
    return { ok: true };
  }

  async addAssignment(
    classroomId: string,
    ownerId: string,
    dto: CreateAssignmentDto,
  ) {
    const c = await this.ownedOrThrow(classroomId, ownerId);
    const count = await this.assignments.countBy({ classroomId });
    if (count >= MAX_ASSIGNMENTS_PER_CLASS)
      throw new BadRequestException(
        `Mỗi lớp giữ tối đa ${MAX_ASSIGNMENTS_PER_CLASS} bài giao — xoá bớt bài cũ trước`,
      );
    if (dto.kind === 'LESSON') {
      if (!(await this.lessons.existsBy({ id: dto.lessonId! })))
        throw new NotFoundException('Không tìm thấy bài học');
    } else if (!PAPERS.some((p) => p.slug === dto.examSlug)) {
      throw new NotFoundException('Không tìm thấy đề thi thử');
    }
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    const { identifiers } = await this.assignments.insert({
      classroomId,
      kind: dto.kind,
      lessonId: dto.kind === 'LESSON' ? dto.lessonId! : null,
      examSlug: dto.kind === 'MOCK_EXAM' ? dto.examSlug! : null,
      dueAt,
    });
    const created = await this.assignments.findOneOrFail({
      where: { id: identifiers[0].id as string },
      relations: { lesson: true },
    });
    const { label, href } = describe(created);
    // Báo cho cả lớp: thông báo trong app + push (NotificationsListener, chạy nền — lỗi không chặn việc giao bài).
    const members = await this.members.find({
      where: { classroomId },
      select: { classroomId: true, userId: true },
    });
    const event: ClassAssignmentCreatedPayload = {
      memberIds: members.map((m) => m.userId),
      teacherName: c.owner.displayName,
      className: c.name,
      title: label,
      href,
      dueAt,
    };
    this.events.emit(AppEvent.ClassAssignmentCreated, event);
    return { ...assignmentView(created), label, href };
  }

  async removeAssignment(
    classroomId: string,
    ownerId: string,
    assignmentId: string,
  ) {
    await this.ownedOrThrow(classroomId, ownerId);
    await this.assignments.delete({ id: assignmentId, classroomId });
    return { ok: true };
  }

  /** Giáo viên: tiến độ từng học viên + bài giao kèm ai đã xong. Học viên: bài giao
   * của mình + bảng phút học tuần này của cả lớp. */
  async detail(classroomId: string, userId: string) {
    const c = await this.classrooms.findOne({
      where: { id: classroomId },
      relations: { owner: true },
    });
    if (!c) throw new NotFoundException('Không tìm thấy lớp');
    const [classMembers, classAssignments] = await Promise.all([
      this.members.find({
        where: { classroomId },
        order: { joinedAt: 'ASC' },
        relations: { user: true },
      }),
      this.assignments.find({
        where: { classroomId },
        order: { createdAt: 'DESC' },
        relations: { lesson: true },
      }),
    ]);
    const isOwner = c.ownerId === userId;
    if (!isOwner && !classMembers.some((m) => m.userId === userId))
      throw new ForbiddenException('Bạn chưa vào lớp này');

    const ids = classMembers.map((m) => m.userId);
    const [stats, facts] = await Promise.all([
      this.memberStats(ids),
      this.completionFacts(ids),
    ]);
    const doneBy = (a: AssignmentRow) =>
      ids.filter((id) =>
        isAssignmentDone(
          a,
          facts.completedLessons.get(id) ?? new Set(),
          facts.examAttempts.get(id) ?? [],
        ),
      );
    const info = {
      id: c.id,
      name: c.name,
      hskLevel: c.hskLevel,
      createdAt: c.createdAt,
      teacher: person(c.owner),
      memberCount: ids.length,
    };
    const members = classMembers.map((m) => ({
      ...person(m.user),
      joinedAt: m.joinedAt,
      ...stats.get(m.userId)!,
    }));

    if (isOwner) {
      const assignments = classAssignments.map((a) => {
        const done = doneBy(a);
        return {
          id: a.id,
          kind: a.kind,
          dueAt: a.dueAt,
          createdAt: a.createdAt,
          ...describe(a),
          doneCount: done.length,
          doneUserIds: done,
        };
      });
      return {
        role: 'owner' as const,
        class: { ...info, code: c.code },
        members,
        assignments,
        summary: {
          activeThisWeek: members.filter((m) => m.daysActive7d > 0).length,
          avgMinutes7d: members.length
            ? Math.round(
                members.reduce((s, m) => s + m.minutes7d, 0) / members.length,
              )
            : 0,
        },
      };
    }

    return {
      role: 'member' as const,
      class: info,
      assignments: classAssignments.map((a) => ({
        id: a.id,
        kind: a.kind,
        dueAt: a.dueAt,
        createdAt: a.createdAt,
        ...describe(a),
        done: doneBy(a).includes(userId),
      })),
      classmates: [...members]
        .sort(
          (a, b) =>
            b.minutes7d - a.minutes7d || b.currentStreak - a.currentStreak,
        )
        .map((m) => ({
          id: m.id,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          minutes7d: m.minutes7d,
          currentStreak: m.currentStreak,
          isMe: m.id === userId,
        })),
    };
  }

  /** Bài giao CHƯA làm ở mọi lớp mình đang học — thẻ "Bài tập của lớp" ở trang chủ. */
  async myAssignments(userId: string) {
    const memberships = await this.members.find({
      where: { userId },
      relations: { classroom: true },
    });
    if (memberships.length === 0) return [];
    const [all, facts] = await Promise.all([
      this.assignments.find({
        where: { classroomId: In(memberships.map((m) => m.classroomId)) },
        order: { createdAt: 'DESC' },
        relations: { lesson: true },
      }),
      this.completionFacts([userId]),
    ]);
    const lessons = facts.completedLessons.get(userId) ?? new Set<string>();
    const attempts = facts.examAttempts.get(userId) ?? [];
    return memberships
      .flatMap(({ classroom }) =>
        all
          .filter((a) => a.classroomId === classroom.id)
          .slice(0, 30) // 30 bài giao mới nhất mỗi lớp
          .filter((a) => !isAssignmentDone(a, lessons, attempts))
          .map((a) => ({
            id: a.id,
            classId: classroom.id,
            className: classroom.name,
            kind: a.kind,
            dueAt: a.dueAt,
            createdAt: a.createdAt,
            ...describe(a),
          })),
      )
      .sort(
        (a, b) =>
          (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      )
      .slice(0, 10);
  }

  private async findByCode(rawCode: string) {
    const code = normalizeClassCode(rawCode);
    const c = code
      ? await this.classrooms.findOne({
          where: { code },
          relations: { owner: true },
        })
      : null;
    if (!c)
      throw new NotFoundException('Không tìm thấy lớp — kiểm tra lại mã lớp');
    const memberCount = await this.members.countBy({ classroomId: c.id });
    return Object.assign(c, { memberCount });
  }

  private async ownedOrThrow(classroomId: string, ownerId: string) {
    const c = await this.classrooms.findOne({
      where: { id: classroomId },
      relations: { owner: true },
    });
    if (!c) throw new NotFoundException('Không tìm thấy lớp');
    if (c.ownerId !== ownerId)
      throw new ForbiddenException(
        'Chỉ giáo viên của lớp mới làm được việc này',
      );
    return c;
  }

  /** Số học viên + số bài giao của từng lớp. */
  private async countsPerClass(classIds: string[]) {
    const ids = [...new Set(classIds)];
    if (ids.length === 0)
      return {
        members: new Map<string, number>(),
        assignments: new Map<string, number>(),
      };
    const count = (
      repo: Repository<ClassroomMember> | Repository<ClassAssignment>,
    ) =>
      repo
        .createQueryBuilder('x')
        .select('x.classroomId', 'classroomId')
        .addSelect('COUNT(*)::int', 'count')
        .where('x.classroomId IN (:...ids)', { ids })
        .groupBy('x.classroomId')
        .getRawMany<{ classroomId: string; count: number }>()
        .then((rows) => new Map(rows.map((r) => [r.classroomId, r.count])));
    const [members, assignments] = await Promise.all([
      count(this.members),
      count(this.assignments),
    ]);
    return { members, assignments };
  }

  private async completionFacts(ids: string[]): Promise<CompletionFacts> {
    if (ids.length === 0)
      return { completedLessons: new Map(), examAttempts: new Map() };
    const [lessons, attempts] = await Promise.all([
      this.lessonProgress.find({
        where: { userId: In(ids), completedAt: Not(IsNull()) },
        select: { id: true, userId: true, lessonId: true },
      }),
      this.mockAttempts.find({
        where: { userId: In(ids) },
        select: { id: true, userId: true, examSlug: true, createdAt: true },
      }),
    ]);
    const completedLessons = new Map<string, Set<string>>();
    for (const l of lessons)
      completedLessons.set(
        l.userId,
        (completedLessons.get(l.userId) ?? new Set()).add(l.lessonId),
      );
    const examAttempts = new Map<
      string,
      { examSlug: string; createdAt: Date }[]
    >();
    for (const a of attempts)
      examAttempts.set(a.userId, [...(examAttempts.get(a.userId) ?? []), a]);
    return { completedLessons, examAttempts };
  }

  /** Số liệu học của từng học viên — đọc thẳng bảng có sẵn (chuỗi ngày, hoạt động
   * theo ngày, bài đã xong, từ đang học, lượt thi thử). */
  private async memberStats(ids: string[]) {
    const out = new Map<string, MemberStats>();
    if (ids.length === 0) return out;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 6);
    const [streaks, week, last, lessons, words, exams] = await Promise.all([
      this.streaks.find({
        where: { userId: In(ids) },
        select: { userId: true, currentStreak: true },
      }),
      // 7 ngày gần nhất: tổng phút học + số ngày có học.
      this.activities
        .createQueryBuilder('a')
        .select('a.userId', 'userId')
        .addSelect('SUM(a.minutesStudied)', 'minutes')
        .addSelect('COUNT(*)::int', 'days')
        .where({ userId: In(ids), localDate: MoreThanOrEqual(since) })
        .groupBy('a.userId')
        .getRawMany<{ userId: string; minutes: number; days: number }>(),
      // Ngày học gần nhất ('YYYY-MM-DD').
      this.activities
        .createQueryBuilder('a')
        .select('a.userId', 'userId')
        .addSelect('MAX(a.localDate)', 'lastDate')
        .where({ userId: In(ids) })
        .groupBy('a.userId')
        .getRawMany<{ userId: string; lastDate: string }>(),
      this.countPerUser(this.lessonProgress, ids, 'p.completedAt IS NOT NULL'),
      this.countPerUser(this.wordProgress, ids, 'p.isSuspended = false'),
      this.mockAttempts.find({
        where: { userId: In(ids) },
        select: {
          id: true,
          userId: true,
          examSlug: true,
          score: true,
          maxScore: true,
          passed: true,
        },
      }),
    ]);
    for (const id of ids) {
      const w = week.find((r) => r.userId === id);
      const mine = exams.filter((e) => e.userId === id);
      const best = [...mine].sort(
        (a, b) => b.score / b.maxScore - a.score / a.maxScore,
      )[0];
      out.set(id, {
        currentStreak: streaks.find((s) => s.userId === id)?.currentStreak ?? 0,
        minutes7d: Math.round(w?.minutes ?? 0),
        daysActive7d: w?.days ?? 0,
        lastStudiedOn: last.find((r) => r.userId === id)?.lastDate ?? null,
        lessonsCompleted: lessons.get(id) ?? 0,
        wordsStudied: words.get(id) ?? 0,
        examCount: mine.length,
        bestExam: best
          ? {
              slug: best.examSlug,
              title:
                PAPERS.find((p) => p.slug === best.examSlug)?.title ??
                best.examSlug,
              score: best.score,
              maxScore: best.maxScore,
              passed: best.passed,
            }
          : null,
      });
    }
    return out;
  }

  /** Đếm số dòng mỗi người (bảng có cột `userId`, bí danh `p`) thoả điều kiện SQL. */
  private async countPerUser(
    repo: Repository<UserLessonProgress> | Repository<UserWordProgress>,
    ids: string[],
    condition: string,
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await repo
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('COUNT(*)::int', 'count')
      .where('p.userId IN (:...ids)', { ids })
      .andWhere(condition)
      .groupBy('p.userId')
      .getRawMany<{ userId: string; count: number }>();
    return new Map(rows.map((r) => [r.userId, r.count]));
  }
}
