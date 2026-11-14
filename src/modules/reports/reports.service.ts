import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentReport } from '../../database/entities';
import type { CreateReportDto } from './dto/create-report.dto';

/** Lưu tối đa ngần này ký tự nội dung bị báo cáo — đủ để đọc lại 1 câu trả lời dài của AI. */
export const REPORT_CONTENT_MAX = 4000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Báo cáo của người dùng (2026-11-14, điều kiện lên CH Play): app có AI tạo nội dung phải cho báo cáo nội dung xúc
 * phạm ngay trong app; app có tên, ảnh người dùng hiện cho người khác phải cho báo cáo người dùng; trang web phải nhận
 * được yêu cầu xoá tài khoản. Máy chủ email chưa cấu hình nên lưu DB — admin đọc qua `GET /reports`.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(ContentReport)
    private readonly reports: Repository<ContentReport>,
  ) {}

  async create(dto: CreateReportDto, userId: string | null) {
    // Bot điền cả ô ẩn: trả lời như thành công để nó không thử cách khác, nhưng không lưu.
    if (dto.website?.trim()) return { ok: true };
    const deletion = dto.kind === 'account-deletion';
    const contact = dto.contact?.trim() || null;
    if (deletion && !userId && !(contact && EMAIL.test(contact))) {
      throw new BadRequestException('Nhập email của tài khoản cần xoá.');
    }
    const content = (dto.content ?? '').trim().slice(0, REPORT_CONTENT_MAX);
    if (!deletion && !content) {
      throw new BadRequestException('Thiếu nội dung cần báo cáo.');
    }
    await this.reports.insert({
      kind: dto.kind,
      reason: deletion ? 'account-deletion' : dto.reason,
      feature: dto.feature ?? null,
      targetId: dto.targetId?.trim() || null,
      content,
      note: dto.note?.trim() ?? '',
      contact: deletion ? contact : null,
      userId,
    });
    this.logger.log(
      `Báo cáo mới: ${dto.kind}${dto.feature ? ` (${dto.feature})` : ''}`,
    );
    return { ok: true };
  }

  list() {
    return this.reports.find({ order: { createdAt: 'DESC' }, take: 200 });
  }
}
