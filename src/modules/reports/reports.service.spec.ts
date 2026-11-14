import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { ContentReport } from '../../database/entities';
import type { CreateReportDto } from './dto/create-report.dto';
import { REPORT_CONTENT_MAX, ReportsService } from './reports.service';

function setup() {
  const insert = jest
    .fn<Promise<undefined>, [Partial<ContentReport>]>()
    .mockResolvedValue(undefined);
  const repo = { insert } as unknown as Repository<ContentReport>;
  return { service: new ReportsService(repo), insert };
}

const ai = (over: Partial<CreateReportDto> = {}): CreateReportDto => ({
  kind: 'ai',
  reason: 'offensive',
  feature: 'assistant',
  content: 'Câu trả lời của AI',
  ...over,
});

describe('ReportsService.create', () => {
  it('lưu báo cáo nội dung AI, cắt nội dung quá dài, không giữ ô liên hệ', async () => {
    const { service, insert } = setup();
    await service.create(
      ai({ content: 'x'.repeat(REPORT_CONTENT_MAX + 50), contact: 'a@b.vn' }),
      'u1',
    );
    const row = insert.mock.calls[0][0];
    expect(row.content).toHaveLength(REPORT_CONTENT_MAX);
    expect(row).toMatchObject({
      kind: 'ai',
      feature: 'assistant',
      contact: null,
      userId: 'u1',
      note: '',
    });
  });

  it('bỏ qua bot điền ô ẩn nhưng vẫn trả thành công', async () => {
    const { service, insert } = setup();
    await expect(
      service.create(ai({ website: 'spam.example' }), null),
    ).resolves.toEqual({ ok: true });
    expect(insert).not.toHaveBeenCalled();
  });

  it('báo cáo AI thiếu nội dung thì từ chối', async () => {
    const { service } = setup();
    await expect(
      service.create(ai({ content: '   ' }), 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('yêu cầu xoá tài khoản khi chưa đăng nhập phải có email hợp lệ', async () => {
    const { service, insert } = setup();
    const req: CreateReportDto = {
      kind: 'account-deletion',
      reason: 'other',
      contact: 'khong-phai-email',
    };
    await expect(service.create(req, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await service.create({ ...req, contact: ' ban@gmail.com ' }, null);
    expect(insert.mock.calls[0][0]).toMatchObject({
      kind: 'account-deletion',
      reason: 'account-deletion',
      contact: 'ban@gmail.com',
      content: '',
      userId: null,
    });
  });
});
