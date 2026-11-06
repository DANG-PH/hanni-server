import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { AuthUser } from '../../common/types';
import type { Env } from '../../config/env.validation';

interface ResourceEntry {
  id: string;
  title: string;
  description: string;
  kind: 'video' | 'pdf' | 'audio';
  /** Thư mục con trong kho tệp: chữ ký phủ cả thư mục để mọi đoạn HLS dùng chung 1 liên kết. */
  dir: string;
  file: string;
  bytes: number;
  sha256: string | null;
  requiresLogin: boolean;
}

/**
 * LUỒNG TẢI HỌC LIỆU: trang /hoc-lieu → GET /resources lấy danh sách → bấm mở → POST /resources/:id/link: server kiểm
 * quyền rồi trả liên kết có hạn → trình duyệt tải thẳng từ Nginx/CDN. API chỉ cấp chữ ký, KHÔNG truyền tệp, nên băng
 * thông video không đi qua tiến trình Node. Nginx tự kiểm chữ ký bằng `secure_link` (infra/k8s/app/media.yaml).
 */
@Injectable()
export class ResourcesService implements OnModuleInit {
  private entries: ResourceEntry[] = [];

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    const path = this.config.get('RESOURCES_MANIFEST', { infer: true });
    if (path)
      this.entries = JSON.parse(readFileSync(path, 'utf8')) as ResourceEntry[];
  }

  list() {
    // Chỉ trả trường công khai: dir và file là đường dẫn thật trong kho tệp.
    return this.entries.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      kind: e.kind,
      bytes: e.bytes,
      sha256: e.sha256,
      requiresLogin: e.requiresLogin,
    }));
  }

  link(id: string, user: AuthUser | undefined, now = Date.now()) {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new NotFoundException('Không tìm thấy học liệu này');
    if (entry.requiresLogin && !user) {
      throw new UnauthorizedException('Bạn cần đăng nhập để mở học liệu này');
    }
    const ttl = this.config.get('RESOURCE_LINK_TTL_SEC', { infer: true });
    const expires = Math.floor(now / 1000) + ttl;
    const secret = this.config.get('RESOURCE_LINK_SECRET', { infer: true });
    const token = createHash('md5')
      .update(`${expires}/${entry.dir} ${secret}`)
      .digest('base64url');
    const base = this.config.get('RESOURCE_BASE_URL', { infer: true });
    return {
      url: `${base}/files/${token}/${expires}/${entry.dir}/${entry.file}`,
      expiresAt: new Date(expires * 1000).toISOString(),
    };
  }
}
