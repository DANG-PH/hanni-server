import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { SubscribeDto } from './dto/push.dto';

@Injectable()
export class PushService {
  private readonly enabled: boolean;
  private readonly publicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.publicKey = this.config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('VAPID_PRIVATE_KEY', { infer: true });
    this.enabled = Boolean(this.publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(
        this.config.get('VAPID_SUBJECT', { infer: true }),
        this.publicKey,
        privateKey,
      );
    }
  }

  private assertEnabled() {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Thông báo đẩy chưa được cấu hình trên máy chủ',
      );
    }
  }

  getPublicKey() {
    this.assertEnabled();
    return { publicKey: this.publicKey };
  }

  async subscribe(userId: string, dto: SubscribeDto, userAgent?: string) {
    this.assertEnabled();
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
      },
    });
    return { ok: true as const };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
    return { ok: true as const };
  }

  /** Gửi thử 1 thông báo tới mọi thiết bị user đã đăng ký; tự dọn subscription hết hạn (404/410). */
  async sendTest(userId: string) {
    this.assertEnabled();
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) {
      throw new NotFoundException(
        'Chưa đăng ký nhận thông báo trên thiết bị nào',
      );
    }

    const payload = JSON.stringify({
      title: 'Hanni',
      body: 'Thông báo thử — mọi thứ đang hoạt động tốt!',
    });

    let sent = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
        }
      }),
    );

    return { sent, total: subs.length };
  }
}
