import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository } from 'typeorm';
import { UserVideoProgress, Video, Word } from '../../database/entities';
import type { VideoProgressDto, VideoQueryDto } from './dto/videos.dto';
import { buildWordIndex, segmentLine, type WordMatch } from './word-match.util';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(UserVideoProgress)
    private readonly progress: Repository<UserVideoProgress>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
  ) {}

  /** Cache trong tiến trình — bảng từ ít khi đổi, không cần build lại mỗi
   * request. Tự build lại nếu rỗng (khởi động lại server) hoặc sau 1 giờ. */
  private wordIndex: Map<string, WordMatch> | null = null;
  private wordIndexAt = 0;
  private async getWordIndex(): Promise<Map<string, WordMatch>> {
    if (this.wordIndex && Date.now() - this.wordIndexAt < 3_600_000) {
      return this.wordIndex;
    }
    const words = await this.words.find({
      select: {
        id: true,
        simplified: true,
        pinyin: true,
        meaningVi: true,
        hskLevel: true,
      },
    });
    this.wordIndex = buildWordIndex(words);
    this.wordIndexAt = Date.now();
    return this.wordIndex;
  }

  /** `userId` null = khách: xem được danh sách, không có tiến độ của riêng mình. */
  async list(userId: string | null, q: VideoQueryDto) {
    const where: FindOptionsWhere<Video> = {};
    if (q.level) where.hskLevel = q.level;
    if (q.kind) where.kind = q.kind;

    const [videos, progress] = await Promise.all([
      this.videos.find({
        where,
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
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
      userId
        ? this.progress.find({
            where: { userId },
            select: {
              id: true,
              videoId: true,
              linesRead: true,
              completedAt: true,
            },
          })
        : Promise.resolve([] as UserVideoProgress[]),
    ]);
    const pBy = new Map(progress.map((p) => [p.videoId, p] as const));
    return videos.map((v) => ({
      ...v,
      progressPct: v.sentenceCount
        ? Math.round(((pBy.get(v.id)?.linesRead ?? 0) / v.sentenceCount) * 100)
        : 0,
      completed: Boolean(pBy.get(v.id)?.completedAt),
    }));
  }

  async get(userId: string | null, id: string) {
    const video = await this.videos.findOne({
      where: { id },
      relations: { lines: true },
      order: { lines: { index: 'ASC' } },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');
    const [progress, wordIndex] = await Promise.all([
      userId ? this.progress.findOneBy({ userId, videoId: id }) : null,
      this.getWordIndex(),
    ]);
    const { lines, ...safe } = video;
    return {
      ...safe,
      lines: lines.map((line) => ({
        ...line,
        tokens: segmentLine(line.zh, wordIndex),
      })),
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
    const video = await this.videos.findOne({
      where: { id },
      select: { id: true, sentenceCount: true },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');
    const linesRead = Math.min(
      dto.linesRead ?? dto.lastLineIndex,
      video.sentenceCount,
    );
    const completed =
      video.sentenceCount > 0 && linesRead >= video.sentenceCount;
    await this.progress.upsert(
      {
        userId,
        videoId: id,
        lastLineIndex: dto.lastLineIndex,
        linesRead,
        completedAt: completed ? new Date() : null,
      },
      ['userId', 'videoId'],
    );
    return { ok: true, completed };
  }
}
