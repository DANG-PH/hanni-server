import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResourcesService } from './resources.service';

const ENTRIES = [
  {
    id: 'r1',
    title: 'Video',
    description: '',
    kind: 'video',
    dir: 'r1',
    file: 'master.m3u8',
    bytes: 10,
    sha256: null,
    requiresLogin: true,
  },
  {
    id: 'r2',
    title: 'PDF',
    description: '',
    kind: 'pdf',
    dir: 'r2',
    file: 'bang.pdf',
    bytes: 10,
    sha256: 'abc',
    requiresLogin: false,
  },
];

function service() {
  const path = join(mkdtempSync(join(tmpdir(), 'hoc-lieu-')), 'manifest.json');
  writeFileSync(path, JSON.stringify(ENTRIES));
  const values: Record<string, unknown> = {
    RESOURCES_MANIFEST: path,
    RESOURCE_LINK_TTL_SEC: 600,
    RESOURCE_LINK_SECRET: 'bi-mat',
    RESOURCE_BASE_URL: 'http://lab',
  };
  const s = new ResourcesService({ get: (k: string) => values[k] } as never);
  s.onModuleInit();
  return s;
}

describe('ResourcesService', () => {
  const user = { id: 'u1', email: 'a@example.test', role: 'user' };
  const now = 1_800_000_000_000;

  it('danh sách không lộ đường dẫn thật', () => {
    expect(service().list()[0]).not.toHaveProperty('dir');
    expect(service().list()[0]).not.toHaveProperty('file');
  });

  it('khách không lấy được học liệu cần đăng nhập', () => {
    expect(() => service().link('r1', undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('khách lấy được học liệu công khai', () => {
    expect(service().link('r2', undefined).url).toContain('/r2/bang.pdf');
  });

  it('không có học liệu thì báo không tìm thấy', () => {
    expect(() => service().link('khong-co', user)).toThrow(NotFoundException);
  });

  it('chữ ký đúng công thức Nginx secure_link và phủ cả thư mục', () => {
    const expires = now / 1000 + 600;
    const token = createHash('md5')
      .update(`${expires}/r1 bi-mat`)
      .digest('base64url');
    expect(service().link('r1', user, now).url).toBe(
      `http://lab/files/${token}/${expires}/r1/master.m3u8`,
    );
  });
});
