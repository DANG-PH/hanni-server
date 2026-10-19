import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PAPERS } from '../mock-exams/mock-exam.content';
import { PushService } from '../push/push.service';
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

const PERSON = { id: true, displayName: true, avatarUrl: true } as const;
const ASSIGNMENT_SELECT = {
  id: true,
  kind: true,
  lessonId: true,
  examSlug: true,
  dueAt: true,
  createdAt: true,
  lesson: {
    select: { id: true, title: true, hskLevel: true, orderIndex: true },
  },
} as const;

type AssignmentRow = Prisma.ClassAssignmentGetPayload<{
  select: typeof ASSIGNMENT_SELECT;
}>;

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
  private readonly logger = new Logger(ClassroomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(ownerId: string, dto: CreateClassroomDto) {
    const owned = await this.prisma.classroom.count({ where: { ownerId } });
    if (owned >= MAX_CLASSES_PER_OWNER)
      throw new BadRequestException(
        `Mỗi tài khoản tạo tối đa ${MAX_CLASSES_PER_OWNER} lớp`,
      );
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.classroom.create({
          data: {
            ownerId,
            name: dto.name.trim(),
            hskLevel: dto.hskLevel ?? null,
            code: makeClassCode(),
          },
          select: { id: true, name: true, code: true, hskLevel: true },
        });
      } catch (err) {
        // Trùng mã (rất hiếm, 31^6 mã) thì sinh mã khác.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        )
          continue;
        throw err;
      }
    }
    throw new ServiceUnavailableException('Chưa tạo được mã lớp, thử lại nhé');
  }

  async mine(userId: string) {
    const [owned, joined, pending] = await Promise.all([
      this.prisma.classroom.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          hskLevel: true,
          createdAt: true,
          _count: { select: { members: true, assignments: true } },
        },
      }),
      this.prisma.classroomMember.findMany({
        where: { userId },
        orderBy: { joinedAt: 'desc' },
        select: {
          joinedAt: true,
          classroom: {
            select: {
              id: true,
              name: true,
              hskLevel: true,
              owner: { select: PERSON },
              _count: { select: { members: true } },
            },
          },
        },
      }),
      this.myAssignments(userId),
    ]);
    return {
      owned: owned.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        hskLevel: c.hskLevel,
        createdAt: c.createdAt,
        memberCount: c._count.members,
        assignmentCount: c._count.assignments,
      })),
      joined: joined.map((m) => ({
        id: m.classroom.id,
        name: m.classroom.name,
        hskLevel: m.classroom.hskLevel,
        teacher: m.classroom.owner,
        memberCount: m.classroom._count.members,
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
      ? !!(await this.prisma.classroomMember.findUnique({
          where: { classroomId_userId: { classroomId: c.id, userId } },
        }))
      : false;
    return {
      id: c.id,
      name: c.name,
      hskLevel: c.hskLevel,
      teacher: c.owner,
      memberCount: c._count.members,
      isOwner: c.ownerId === userId,
      isMember,
    };
  }

  async join(rawCode: string, userId: string) {
    const c = await this.findByCode(rawCode);
    if (c.ownerId === userId)
      throw new BadRequestException('Bạn là giáo viên của lớp này rồi');
    if (c._count.members >= MAX_MEMBERS_PER_CLASS)
      throw new BadRequestException(
        `Lớp đã đủ ${MAX_MEMBERS_PER_CLASS} học viên`,
      );
    await this.prisma.classroomMember.upsert({
      where: { classroomId_userId: { classroomId: c.id, userId } },
      create: { classroomId: c.id, userId },
      update: {},
    });
    return { id: c.id };
  }

  async leave(classroomId: string, userId: string) {
    await this.prisma.classroomMember.deleteMany({
      where: { classroomId, userId },
    });
    return { ok: true };
  }

  async update(classroomId: string, ownerId: string, dto: UpdateClassroomDto) {
    await this.ownedOrThrow(classroomId, ownerId);
    return this.prisma.classroom.update({
      where: { id: classroomId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.hskLevel !== undefined && { hskLevel: dto.hskLevel }),
      },
      select: { id: true, name: true, code: true, hskLevel: true },
    });
  }

  async remove(classroomId: string, ownerId: string) {
    await this.ownedOrThrow(classroomId, ownerId);
    await this.prisma.classroom.delete({ where: { id: classroomId } });
    return { ok: true };
  }

  async removeMember(classroomId: string, ownerId: string, memberId: string) {
    await this.ownedOrThrow(classroomId, ownerId);
    await this.prisma.classroomMember.deleteMany({
      where: { classroomId, userId: memberId },
    });
    return { ok: true };
  }

  async addAssignment(
    classroomId: string,
    ownerId: string,
    dto: CreateAssignmentDto,
  ) {
    const c = await this.ownedOrThrow(classroomId, ownerId);
    const count = await this.prisma.classAssignment.count({
      where: { classroomId },
    });
    if (count >= MAX_ASSIGNMENTS_PER_CLASS)
      throw new BadRequestException(
        `Mỗi lớp giữ tối đa ${MAX_ASSIGNMENTS_PER_CLASS} bài giao — xoá bớt bài cũ trước`,
      );
    if (dto.kind === 'LESSON') {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId! },
        select: { id: true },
      });
      if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    } else if (!PAPERS.some((p) => p.slug === dto.examSlug)) {
      throw new NotFoundException('Không tìm thấy đề thi thử');
    }
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    const created = await this.prisma.classAssignment.create({
      data: {
        classroomId,
        kind: dto.kind,
        lessonId: dto.kind === 'LESSON' ? dto.lessonId! : null,
        examSlug: dto.kind === 'MOCK_EXAM' ? dto.examSlug! : null,
        dueAt,
      },
      select: ASSIGNMENT_SELECT,
    });
    const { label, href } = describe(created);
    // Báo cho cả lớp — chạy nền, push lỗi không chặn việc giao bài.
    const members = await this.prisma.classroomMember.findMany({
      where: { classroomId },
      select: { userId: true },
    });
    const due = dueAt
      ? ` — hạn ${dueAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}`
      : '';
    void Promise.allSettled(
      members.map((m) =>
        this.push.sendToUser(
          m.userId,
          `Bài tập mới · ${c.name}`,
          `${c.owner.displayName} vừa giao: ${label}${due}`,
        ),
      ),
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed)
        this.logger.warn(`Không gửi được push bài giao cho ${failed} học viên`);
    });
    return { ...created, label, href };
  }

  async removeAssignment(
    classroomId: string,
    ownerId: string,
    assignmentId: string,
  ) {
    await this.ownedOrThrow(classroomId, ownerId);
    await this.prisma.classAssignment.deleteMany({
      where: { id: assignmentId, classroomId },
    });
    return { ok: true };
  }

  /** Giáo viên: tiến độ từng học viên + bài giao kèm ai đã xong. Học viên: bài giao
   * của mình + bảng phút học tuần này của cả lớp. */
  async detail(classroomId: string, userId: string) {
    const c = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        code: true,
        hskLevel: true,
        createdAt: true,
        ownerId: true,
        owner: { select: PERSON },
        members: {
          orderBy: { joinedAt: 'asc' },
          select: { userId: true, joinedAt: true, user: { select: PERSON } },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          select: ASSIGNMENT_SELECT,
        },
      },
    });
    if (!c) throw new NotFoundException('Không tìm thấy lớp');
    const isOwner = c.ownerId === userId;
    if (!isOwner && !c.members.some((m) => m.userId === userId))
      throw new ForbiddenException('Bạn chưa vào lớp này');

    const ids = c.members.map((m) => m.userId);
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
      teacher: c.owner,
      memberCount: ids.length,
    };
    const members = c.members.map((m) => ({
      ...m.user,
      joinedAt: m.joinedAt,
      ...stats.get(m.userId)!,
    }));

    if (isOwner) {
      const assignments = c.assignments.map((a) => {
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
      assignments: c.assignments.map((a) => ({
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
    const memberships = await this.prisma.classroomMember.findMany({
      where: { userId },
      select: {
        classroom: {
          select: {
            id: true,
            name: true,
            assignments: {
              orderBy: { createdAt: 'desc' },
              take: 30,
              select: ASSIGNMENT_SELECT,
            },
          },
        },
      },
    });
    if (memberships.length === 0) return [];
    const facts = await this.completionFacts([userId]);
    const lessons = facts.completedLessons.get(userId) ?? new Set<string>();
    const attempts = facts.examAttempts.get(userId) ?? [];
    return memberships
      .flatMap(({ classroom }) =>
        classroom.assignments
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
      ? await this.prisma.classroom.findUnique({
          where: { code },
          select: {
            id: true,
            name: true,
            hskLevel: true,
            ownerId: true,
            owner: { select: PERSON },
            _count: { select: { members: true } },
          },
        })
      : null;
    if (!c)
      throw new NotFoundException('Không tìm thấy lớp — kiểm tra lại mã lớp');
    return c;
  }

  private async ownedOrThrow(classroomId: string, ownerId: string) {
    const c = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: PERSON },
      },
    });
    if (!c) throw new NotFoundException('Không tìm thấy lớp');
    if (c.ownerId !== ownerId)
      throw new ForbiddenException(
        'Chỉ giáo viên của lớp mới làm được việc này',
      );
    return c;
  }

  private async completionFacts(ids: string[]): Promise<CompletionFacts> {
    if (ids.length === 0)
      return { completedLessons: new Map(), examAttempts: new Map() };
    const [lessons, attempts] = await Promise.all([
      this.prisma.userLessonProgress.findMany({
        where: { userId: { in: ids }, completedAt: { not: null } },
        select: { userId: true, lessonId: true },
      }),
      this.prisma.mockExamAttempt.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, examSlug: true, createdAt: true },
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
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 6);
    const [streaks, week, last, lessons, words, exams] = await Promise.all([
      this.prisma.userStreak.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, currentStreak: true },
      }),
      this.prisma.userDailyActivity.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, localDate: { gte: since } },
        _sum: { minutesStudied: true },
        _count: true,
      }),
      this.prisma.userDailyActivity.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _max: { localDate: true },
      }),
      this.prisma.userLessonProgress.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, completedAt: { not: null } },
        _count: true,
      }),
      this.prisma.userWordProgress.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, isSuspended: false },
        _count: true,
      }),
      this.prisma.mockExamAttempt.findMany({
        where: { userId: { in: ids } },
        select: {
          userId: true,
          examSlug: true,
          score: true,
          maxScore: true,
          passed: true,
        },
      }),
    ]);
    const out = new Map<
      string,
      {
        currentStreak: number;
        minutes7d: number;
        daysActive7d: number;
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
    >();
    for (const id of ids) {
      const w = week.find((r) => r.userId === id);
      const mine = exams.filter((e) => e.userId === id);
      const best = [...mine].sort(
        (a, b) => b.score / b.maxScore - a.score / a.maxScore,
      )[0];
      const lastDate = last.find((r) => r.userId === id)?._max.localDate;
      out.set(id, {
        currentStreak: streaks.find((s) => s.userId === id)?.currentStreak ?? 0,
        minutes7d: Math.round(w?._sum.minutesStudied ?? 0),
        daysActive7d: w?._count ?? 0,
        lastStudiedOn: lastDate ? lastDate.toISOString().slice(0, 10) : null,
        lessonsCompleted: lessons.find((r) => r.userId === id)?._count ?? 0,
        wordsStudied: words.find((r) => r.userId === id)?._count ?? 0,
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
}
