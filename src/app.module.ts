import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './infra/redis/redis.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiToolsModule } from './modules/ai-tools/ai-tools.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';
import { PartnersModule } from './modules/partners/partners.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { GamificationModule } from './modules/gamification/gamification.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { InsightsModule } from './modules/insights/insights.module';
import { MockExamsModule } from './modules/mock-exams/mock-exams.module';
import { PinyinModule } from './modules/pinyin/pinyin.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { LearnModule } from './modules/learn/learn.module';
import { VideosModule } from './modules/videos/videos.module';
import { MailModule } from './modules/mail/mail.module';
import { MinigameModule } from './modules/minigame/minigame.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PracticeModule } from './modules/practice/practice.module';
import { PremiumModule } from './modules/premium/premium.module';
import { ProgressModule } from './modules/progress/progress.module';
import { PushModule } from './modules/push/push.module';
import { QuestsModule } from './modules/quests/quests.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { RoleplayModule } from './modules/roleplay/roleplay.module';
import { ScanModule } from './modules/scan/scan.module';
import { SrsModule } from './modules/srs/srs.module';
import { UsersModule } from './modules/users/users.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';

/**
 * MỤC LỤC SERVER — thấy 1 lời gọi API trên giao diện (DevTools → Network, hoặc chuỗi "/xxx/…" trong hanni-client)
 * thì tìm code ở đâu. Mọi route có tiền tố /api (main.ts). Mỗi controller có khối "BẢN ĐỒ" ở đầu file ghi route nào
 * do nút/trang nào gọi; logic nằm ở service mà handler gọi (bấm F12 vào `this.xxx.method()`).
 *
 *   URL bắt đầu bằng              → thư mục src/modules/…      (khác tên thư mục: đánh dấu ★)
 *   /auth                         → auth/            đăng ký, đăng nhập, Google, refresh token, quên mật khẩu
 *   /users                        → users/           hồ sơ, ảnh đại diện, mật khẩu, cài đặt, xoá tài khoản
 *   /words /dictionary /levels  ★ → vocabulary/      từ điển, tra từ có xếp hạng (word-search.util.ts), cấp HSK
 *   /learn                        → learn/           lộ trình, phiên học 1 bài, kiểm tra trình độ
 *   /study                      ★ → srs/             ôn tập flashcard: hàng đợi, chấm thẻ (SM-2 / FSRS)
 *   /streak /achievements /quiz ★ → gamification/    chuỗi ngày, huy hiệu, quiz cuối buổi ôn
 *   /mock-exams                   → mock-exams/      đề thi thử HSK (đề viết bằng TS ở papers/), chấm, chữa bài
 *   /grammar                      → grammar/         ngữ pháp
 *   /pinyin                       → pinyin/          bảng phiên âm
 *   /practice                     → practice/        lượt luyện nghe / phát âm
 *   /videos                       → videos/          học qua video (phụ đề, bấm từ để tra)
 *   /leaderboard                  → leaderboard/     bảng xếp hạng + giải đấu tuần (league.service.ts)
 *   /quests                       → quests/          nhiệm vụ hằng ngày
 *   /minigame                     → minigame/        4 trò chơi
 *   /progress                     → progress/        tổng quan tiến độ
 *   /insights                     → insights/        báo cáo tuần/tháng/quý + Hanni Coach (AI)
 *   /onboarding                   → onboarding/      khảo sát đầu vào
 *   /classrooms                   → classrooms/      lớp học của giáo viên
 *   /partners                     → partners/        form liên hệ "Dành cho giáo viên"
 *   /assistant                    → assistant/       trợ lý AI (RAG + Gemini, trả lời dạng stream)
 *   /roleplay                     → roleplay/        luyện nói với AI theo tình huống
 *   /ai                         ★ → ai-tools/        mẹo nhớ, chấm câu, phân tích câu, bài đọc AI
 *   /scan                         → scan/            quét ảnh học từ (Gemini vision)
 *   /payments /premium            → payments/ premium/  thanh toán payOS + MoMo (đơn hàng ở payments.service.ts,
 *                                                     gọi cổng ở payos.service.ts / momo.service.ts) + trạng thái Premium
 *   /push /notifications /mail    → push/ notifications/ mail/  thông báo đẩy, chuông thông báo, email
 *   /referrals                    → referrals/       mời bạn bè
 *   /health                       → src/health/      giám sát (GitHub Actions gọi)
 *
 * Chạy NGẦM, không có giao diện gọi: mỗi giờ — push/reminder.service.ts (nhắc học, sắp mất chuỗi), mail/weekly-
 * digest.service.ts (email tuần), leaderboard/league.service.ts checkRollover (chốt giải đấu tuần); mỗi 5 phút —
 * payments/payments.service.ts reconcilePending (hỏi lại payOS/MoMo các đơn chưa xác nhận). WebSocket chuông
 * thông báo: notifications/notifications.gateway.ts (namespace /notifications). Sự kiện nội bộ (src/events/events.ts)
 * do các *.listener.ts nghe: gamification (huy hiệu), progress (tiến độ bài), notifications (tạo thông báo), referrals.
 *
 * THAM SỐ HAY ĐỔI — sửa đúng 1 hằng số (đường dẫn trong src/modules/), server dev tự nạp lại; chạy `npx jest` nếu có test:
 *   Hạn mức AI miễn phí / ngày   assistant/assistant.service.ts FREE_ASK_DAILY_LIMIT (15) · roleplay/roleplay.service.ts
 *                                FREE_ROLEPLAY_DAILY_LIMIT (15) · ai-tools/ai-tools.util.ts FREE_/PREMIUM_AI_TOOLS_DAILY_LIMIT
 *                                (10/200) · scan/scan.util.ts FREE_/PREMIUM_SCAN_DAILY_LIMIT (3/100) · cách đếm chung (ngày học,
 *                                trả lượt khi AI lỗi): src/infra/redis/daily-quota.service.ts
 *   Giá gói Premium              premium/premium-plans.ts PREMIUM_PLANS (priceVnd)
 *   Phiên học 1 bài              learn/lesson-session.util.ts CHUNK (4 từ/nhóm), OPTION_COUNT (4 phương án)
 *   Kiểm tra trình độ            learn/placement.service.ts PER_LEVEL (4 câu/cấp), PASS_PER_LEVEL (đúng 3 là qua)
 *   Ôn tập (SRS)                 srs/srs.constants.ts LEARNED_INTERVAL_DAYS (21 ngày = "đã thuộc") ·
 *                                srs/scheduler/sm2.scheduler.ts LEECH_LAPSES (sai 8 lần = "từ khó nhớ")
 *   Thi thử                      mock-exams/mock-exam.content.ts PASS_RATIO (0.6) · thời gian: durationMin trong papers/*.ts
 *   Chuỗi ngày + lá chắn         gamification/streak/streak.util.ts MAX_STREAK_FREEZE (2), FREEZE_MILESTONE_DAYS (7)
 *   Nhiệm vụ hằng ngày           quests/quest.util.ts QUEST_POOL (tên + chỉ tiêu)
 *   Nhắc học                     push/push.service.ts DEFAULT_REMINDER_HOUR (20h) · push/reminder.service.ts STREAK_RISK_HOUR
 *   Tra từ (chỉ mục trong RAM)   vocabulary/words.service.ts SEARCH_INDEX_TTL_MS · xếp hạng: vocabulary/word-search.util.ts
 *   Thanh toán                   payments/payments.service.ts PAYMENT_LINK_TTL_MS (15 phút hạn mã QR), RECONCILE_WINDOW_MS
 *                                (7 ngày đối soát) · mã kết quả MoMo:
 *                                payments/momo.util.ts MOMO_PENDING_CODES / MOMO_FAILED_CODES
 *   Biến môi trường (.env)       config/env.validation.ts — THROTTLE_LIMIT, STREAK_DAY_CUTOFF_HOUR, khoá payOS/MoMo/Gemini…
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Phục vụ file audio phát âm: /media/audio/cmn-<hán tự>.mp3
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'assets', 'audio'),
      serveRoot: '/media/audio',
      serveStaticOptions: { immutable: true, maxAge: '30d', fallthrough: true },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'assets', 'avatars'),
      serveRoot: '/media/avatars',
      serveStaticOptions: { maxAge: '7d', fallthrough: true },
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
            limit: Number(process.env.THROTTLE_LIMIT ?? 100),
          },
        ],
      }),
    }),

    DatabaseModule,
    RedisModule,
    MailModule,

    AuthModule,
    UsersModule,
    VocabularyModule,
    SrsModule,
    ProgressModule,
    LearnModule,
    VideosModule,
    GamificationModule,
    GrammarModule,
    MockExamsModule,
    PinyinModule,
    LeaderboardModule,
    PushModule,
    NotificationsModule,
    PracticeModule,
    OnboardingModule,
    AssistantModule,
    RoleplayModule,
    ReferralsModule,
    QuestsModule,
    MinigameModule,
    PaymentsModule,
    PremiumModule,
    InsightsModule,
    ScanModule,
    AiToolsModule,
    ClassroomsModule,
    PartnersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
