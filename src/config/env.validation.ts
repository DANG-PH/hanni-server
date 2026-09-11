import { z } from 'zod';

/**
 * Schema kiểm tra biến môi trường. App sẽ dừng ngay khi khởi động nếu thiếu/sai
 * biến bắt buộc — tốt hơn là lỗi lắt nhắt lúc chạy.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  API_PREFIX: z.string().default('/api'),
  APP_URL: z.string().url().default('http://localhost:8000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().default('30d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Chỉ cần Client ID (công khai) — luồng verify id_token không dùng client secret.
  GOOGLE_CLIENT_ID: z.string().min(1),

  MAIL_HOST: z.string().default(''),
  MAIL_PORT: z.coerce.number().int().default(587),
  MAIL_USER: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('Hanni <no-reply@hanni.app>'),

  SRS_SCHEDULER: z.enum(['sm2', 'fsrs']).default('sm2'),
  SRS_DEFAULT_NEW_PER_DAY: z.coerce.number().int().positive().default(10),
  SRS_DEFAULT_TARGET_RETENTION: z.coerce
    .number()
    .min(0.7)
    .max(0.99)
    .default(0.9),

  DEFAULT_USER_TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
  STREAK_DAY_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(3),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  AUDIO_BASE_URL: z.string().default(''),

  // Thông báo đẩy (Web Push) — để trống thì PushService tự báo lỗi rõ ràng
  // khi gọi, không chặn app khởi động.
  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:support@hanni.app'),

  SEED_RESET: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
  }
  return parsed.data;
}
