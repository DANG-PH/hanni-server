import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VideoKind } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type {
  CreateVideoDto,
  VideoProgressDto,
  VideoQueryDto,
} from './dto/videos.dto';
import { pinyin } from 'pinyin-pro';
import { parseTranscript, type ParsedLine } from './transcript.util';
import { translateLinesToVi } from './translate.util';
import { fetchTimedTranscript } from './youtube-transcript.util';
import { fetchOembed, parseYoutubeId } from './youtube.util';

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: VideoQueryDto) {
    const where: Prisma.VideoWhereInput = {};
    if (q.level) where.hskLevel = q.level;
    if (q.kind) where.kind = q.kind;
    if (q.mine === 'true') where.createdById = userId;

    const [videos, progress] = await Promise.all([
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
          createdById: true,
        },
      }),
      this.prisma.userVideoProgress.findMany({
        where: { userId },
        select: { videoId: true, linesRead: true, completedAt: true },
      }),
    ]);
    const pBy = new Map(progress.map((p) => [p.videoId, p]));
    return videos.map((v) => ({
      ...v,
      isOwner: v.createdById === userId,
      progressPct: v.sentenceCount
        ? Math.round(
            ((pBy.get(v.id)?.linesRead ?? 0) / v.sentenceCount) * 100,
          )
        : 0,
      completed: Boolean(pBy.get(v.id)?.completedAt),
    }));
  }

  async get(userId: string, id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { lines: { orderBy: { index: 'asc' } } },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');
    const progress = await this.prisma.userVideoProgress.findUnique({
      where: { userId_videoId: { userId, videoId: id } },
    });
    const { createdById, ...safe } = video;
    return {
      ...safe,
      isOwner: createdById === userId,
      progress: progress
        ? {
            lastLineIndex: progress.lastLineIndex,
            linesRead: progress.linesRead,
            completed: Boolean(progress.completedAt),
          }
        : { lastLineIndex: 0, linesRead: 0, completed: false },
    };
  }

  async create(userId: string, dto: CreateVideoDto) {
    const youtubeId = parseYoutubeId(dto.youtubeUrl);

    // Có bản chép dán vào → dùng luôn. Không → tự lấy phụ đề tiếng Trung từ YouTube.
    let parsed: ParsedLine[];
    if (dto.transcript?.trim()) {
      parsed = parseTranscript(dto.transcript);
    } else {
      const timed = await fetchTimedTranscript(youtubeId).catch(() => []);
      parsed = timed.map((tl, i) => ({
        index: i + 1,
        startMs: tl.startMs,
        zh: tl.zh,
        pinyin: pinyin(tl.zh, { toneType: 'symbol', nonZh: 'consecutive' }),
        pinyinNum: pinyin(tl.zh, { toneType: 'num', nonZh: 'consecutive' }),
        vi: null,
      }));
    }
    if (parsed.length === 0) {
      throw new BadRequestException(
        'Không có bản chép: hãy dán bản chép, hoặc video này chưa có phụ đề tiếng Trung trên YouTube',
      );
    }

    const oembed = await fetchOembed(youtubeId);
    const video = await this.prisma.video.create({
      data: {
        youtubeId,
        title: dto.title?.trim() || oembed.title || 'Video chưa đặt tên',
        titleZh: dto.titleZh?.trim() || null,
        description: dto.description?.trim() || null,
        hskLevel: dto.hskLevel ?? null,
        kind: dto.kind ?? VideoKind.PODCAST,
        sentenceCount: parsed.length,
        thumbnailUrl: oembed.thumbnailUrl ?? null,
        author: oembed.author ?? null,
        createdById: userId,
        lines: {
          create: parsed.map((l) => ({
            index: l.index,
            startMs: l.startMs,
            zh: l.zh,
            pinyin: l.pinyin,
            pinyinNum: l.pinyinNum,
            vi: l.vi,
          })),
        },
      },
      select: { id: true },
    });

    // Câu chưa kèm bản dịch → dịch máy (miễn phí) CHẠY NỀN, không chặn phản hồi.
    // Các dòng được cập nhật dần; client tải lại video sẽ thấy bản dịch.
    if (parsed.some((l) => l.vi == null)) {
      void this.backfillTranslations(video.id);
    }
    return { id: video.id };
  }

  /** Nền: dịch các dòng còn thiếu `vi` của một video rồi ghi vào DB. */
  private async backfillTranslations(videoId: string): Promise<void> {
    try {
      const rows = await this.prisma.videoLine.findMany({
        where: { videoId, vi: null },
        select: { id: true, zh: true },
        orderBy: { index: 'asc' },
      });
      if (!rows.length) return;
      const vis = await translateLinesToVi(rows.map((r) => r.zh));

      // Gom các dòng cùng bản dịch → 1 updateMany mỗi bản dịch (video thoại lặp
      // nhiều nên số câu KHÁC nhau ít hơn hẳn tổng số dòng).
      const byVi = new Map<string, string[]>();
      rows.forEach((r, i) => {
        const vi = vis[i];
        if (vi == null) return;
        const ids = byVi.get(vi) ?? [];
        ids.push(r.id);
        byVi.set(vi, ids);
      });
      for (const [vi, ids] of byVi) {
        await this.prisma.videoLine.updateMany({
          where: { id: { in: ids } },
          data: { vi },
        });
      }
    } catch (err) {
      console.error(
        `Dịch nền video ${videoId} lỗi:`,
        (err as Error).message,
      );
    }
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

  async remove(userId: string, id: string, role: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!video) throw new NotFoundException('Không tìm thấy video');
    if (video.createdById !== userId && role !== 'admin') {
      throw new ForbiddenException('Chỉ người thêm video mới xoá được');
    }
    await this.prisma.video.delete({ where: { id } });
    return { ok: true };
  }
}
