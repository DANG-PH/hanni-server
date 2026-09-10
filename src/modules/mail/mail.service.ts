import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

/**
 * Bản core: chỉ log nội dung mail ra console (đủ để test luồng verify/reset ở dev).
 * Khi cần gửi thật: cắm nodemailer / Resend vào đây, giữ nguyên chữ ký hàm.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    await this.deliver(to, 'Xác minh email Hanni', `Nhấn để xác minh: ${link}`);
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    await this.deliver(to, 'Đặt lại mật khẩu Hanni', `Nhấn để đặt lại: ${link}`);
  }

  private async deliver(to: string, subject: string, body: string): Promise<void> {
    const host = this.config.get('MAIL_HOST', { infer: true });
    if (!host) {
      this.logger.log(`[MAIL:dev] tới=${to} | ${subject}\n${body}`);
      return Promise.resolve();
    }
    // TODO: tích hợp SMTP/Resend thật.
    this.logger.log(`[MAIL] gửi tới ${to}: ${subject}`);
    return Promise.resolve();
  }
}
