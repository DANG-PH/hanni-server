import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnerLead } from '../../database/entities';
import type { CreatePartnerLeadDto } from './dto/partner-lead.dto';

/** Liên hệ hợp tác từ trang /hop-tac (2026-10-19). Máy chủ email chưa cấu hình nên
 * lưu DB — admin đọc qua `GET /partners/leads`. */
@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    @InjectRepository(PartnerLead)
    private readonly partnerLeads: Repository<PartnerLead>,
  ) {}

  async createLead(dto: CreatePartnerLeadDto, userId: string | null) {
    // Bot điền cả ô ẩn: trả lời như thành công để nó không thử cách khác, nhưng không lưu.
    if (dto.website?.trim()) return { ok: true };
    await this.partnerLeads.insert({
      name: dto.name.trim(),
      kind: dto.kind,
      contact: dto.contact.trim(),
      message: dto.message?.trim() ?? '',
      userId,
    });
    this.logger.log(`Liên hệ hợp tác mới (${dto.kind})`);
    return { ok: true };
  }

  leads() {
    return this.partnerLeads.find({ order: { createdAt: 'DESC' }, take: 200 });
  }
}
