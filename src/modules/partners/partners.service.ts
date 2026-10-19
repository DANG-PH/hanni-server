import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { CreatePartnerLeadDto } from './dto/partner-lead.dto';

/** Liên hệ hợp tác từ trang /hop-tac (2026-10-19). Máy chủ email chưa cấu hình nên
 * lưu DB — admin đọc qua `GET /partners/leads`. */
@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLead(dto: CreatePartnerLeadDto, userId: string | null) {
    // Bot điền cả ô ẩn: trả lời như thành công để nó không thử cách khác, nhưng không lưu.
    if (dto.website?.trim()) return { ok: true };
    await this.prisma.partnerLead.create({
      data: {
        name: dto.name.trim(),
        kind: dto.kind,
        contact: dto.contact.trim(),
        message: dto.message?.trim() ?? '',
        userId,
      },
    });
    this.logger.log(`Liên hệ hợp tác mới (${dto.kind})`);
    return { ok: true };
  }

  leads() {
    return this.prisma.partnerLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
