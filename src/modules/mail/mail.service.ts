import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../../config/env.validation';
import {
  passwordResetHtml,
  verifyEmailHtml,
  weeklyDigestHtml,
} from './templates';

/**
 * Để trống MAIL_HOST (mặc định) -> chỉ log nội dung mail ra console (đủ để
 * test luồng verify/reset ở dev, KHÔNG throw). Có MAIL_HOST -> gửi SMTP thật
 * qua nodemailer — trước đây dù có cấu hình MAIL_HOST vẫn chỉ log suông chứ
 * chưa từng gửi thật (còn nguyên `// TODO: tích hợp SMTP/Resend thật`), khiến
 * xác minh email/đặt lại mật khẩu KHÔNG hoạt động được trên production nếu
 * chỉ điền env mà không sửa code. Lỗi gửi mail chỉ log, không throw ra ngoài
 * — giữ đúng hành vi cũ của forgotPassword() (luôn coi như thành công để
 * không lộ email nào tồn tại) và tránh 500 cho người dùng vì SMTP trục trặc.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const host = this.config.get('MAIL_HOST', { infer: true });
    if (!host) return;
    this.transporter = createTransport({
      host,
      port: this.config.get('MAIL_PORT', { infer: true }),
      secure: this.config.get('MAIL_PORT', { infer: true }) === 465,
      auth: {
        user: this.config.get('MAIL_USER', { infer: true }),
        pass: this.config.get('MAIL_PASSWORD', { infer: true }),
      },
    });
  }

  private get frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    await this.deliver(
      to,
      'Xác minh email Hanni',
      `Nhấn để xác minh: ${link}`,
      verifyEmailHtml(link),
    );
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    await this.deliver(
      to,
      'Đặt lại mật khẩu Hanni',
      `Nhấn để đặt lại: ${link}`,
      passwordResetHtml(link),
    );
  }

  async sendWeeklyDigest(
    to: string,
    stats: {
      displayName: string;
      daysStudied: number;
      wordsReviewed: number;
      wordsLearned: number;
      currentStreak: number;
    },
  ): Promise<void> {
    const subject =
      stats.daysStudied > 0
        ? 'Tổng kết tuần học tiếng Trung của bạn'
        : 'Đã lâu không gặp bạn trên Hanni 👋';
    await this.deliver(
      to,
      subject,
      subject,
      weeklyDigestHtml({ ...stats, appUrl: this.frontendUrl }),
    );
  }

  private async deliver(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL:dev] tới=${to} | ${subject}\n${text}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM', { infer: true }),
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`[MAIL] đã gửi tới ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(
        `[MAIL] gửi tới ${to} thất bại: ${(err as Error).message}`,
      );
    }
  }
}
