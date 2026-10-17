import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { VideoProgressDto, VideoQueryDto } from './dto/videos.dto';
import { buildWordIndex, segmentLine, type WordMatch } from './word-match.util';

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cache trong tiến trình — bảng từ ít khi đổi, không cần build lại mỗi
   * request. Tự build lại nếu rỗng (khởi động lại server) hoặc sau 1 giờ. */
  private wordIndex: Map<string, WordMatch> | null = null;
  private wordIndexAt = 0;
  private async getWordIndex(): Promise<Map<string, WordMatch>> {
    if (this.wordIndex && Date.now() - this.wordIndexAt < 3_600_000) {
      return this.wordIndex;
    }
    const words = await this.prisma.word.findMany({
      select: {
        id: true,
        simplified: true,
        pinyin: true,
        meaningVi: true,
        hskLevel: true,
        imageUrl: true,
      },
    });
    this.wordIndex = buildWordIndex(words);
    this.wordIndexAt = Date.now();
    return this.wordIndex;
  }

  async list(userId: string, q: VideoQueryDto) {
    const where: Prisma.VideoWhereInput = {};
    if (q.level) where.hskLevel = q.level;
    if (q.kind) where.kind = q.kind;

    const [videos, progress, likeCounts, myLikes] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          youtubeId: true,
          title: true,
          titleZh: true,
          description: true,
          hskLevel: true,
          kind: true,
          sentenceCount: true,
          thumbnailUrl: true,
          author: true,
          isFree: true,
        },
      }),
      this.prisma.userVideoProgress.findMany({
        where: { userId },
        select: { videoId: true, linesRead: true, completedAt: true },
      }),
      this.prisma.videoLike.groupBy({
        by: ['videoId'],
        _count: { videoId: true },
      }),
      this.prisma.videoLike.findMany({
        where: { userId },
        select: { videoId: true },
      }),
    ]);
    const pBy = new Map(progress.map((p) => [p.videoId, p]));
    const likeBy = new Map(
      likeCounts.map((l) => [l.videoId, l._count.videoId]),
    );
    const likedSet = new Set(myLikes.map((l) => l.videoId));
    return videos.map((v) => ({
      ...v,
      progressPct: v.sentenceCount
        ? Math.round(((pBy.get(v.id)?.linesRead ?? 0) / v.sentenceCount) * 100)
        : 0,
      completed: Boolean(pBy.get(v.id)?.completedAt),
      likeCount: likeBy.get(v.id) ?? 0,
      likedByMe: likedSet.has(v.id),
    }));
  }

  async get(userId: string, id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { lines: { orderBy: { index: 'asc' } } },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');
    const [progress, likeCount, myLike, commentCount, wordIndex] =
      await Promise.all([
        this.prisma.userVideoProgress.findUnique({
          where: { userId_videoId: { userId, videoId: id } },
        }),
        this.prisma.videoLike.count({ where: { videoId: id } }),
        this.prisma.videoLike.findUnique({
          where: { userId_videoId: { userId, videoId: id } },
        }),
        this.prisma.videoComment.count({ where: { videoId: id } }),
        this.getWordIndex(),
      ]);
    const { lines, ...safe } = video;
    return {
      ...safe,
      lines: lines.map((line) => ({
        ...line,
        tokens: segmentLine(line.zh, wordIndex),
      })),
      likeCount,
      likedByMe: Boolean(myLike),
      commentCount,
      progress: progress
        ? {
            lastLineIndex: progress.lastLineIndex,
            linesRead: progress.linesRead,
            completed: Boolean(progress.completedAt),
          }
        : { lastLineIndex: 0, linesRead: 0, completed: false },
    };
  }

  async updateProgress(userId: string, id: string, dto: VideoProgressDto) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: { sentenceCount: true },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');
    const linesRead = Math.min(
      dto.linesRead ?? dto.lastLineIndex,
      video.sentenceCount,
    );
    const completed =
      video.sentenceCount > 0 && linesRead >= video.sentenceCount;
    await this.prisma.userVideoProgress.upsert({
      where: { userId_videoId: { userId, videoId: id } },
      create: {
        userId,
        videoId: id,
        lastLineIndex: dto.lastLineIndex,
        linesRead,
        completedAt: completed ? new Date() : null,
      },
      update: {
        lastLineIndex: dto.lastLineIndex,
        linesRead: { set: linesRead },
        completedAt: completed ? new Date() : null,
      },
    });
    return { ok: true, completed };
  }
}
