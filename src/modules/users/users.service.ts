import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DataSource, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import type { Env } from '../../config/env.validation';
import {
  Account,
  User,
  UserAchievement,
  UserLessonProgress,
  UserSettings,
  UserStreak,
  UserWordProgress,
} from '../../database/entities';
import { AuthProvider, SrsState } from '../../database/enums';
import { insertIfAbsent } from '../../database/repository.util';
import { PasswordService } from '../auth/password.service';
import { isPremiumActive } from '../premium/premium-plans';
import { LEARNED_INTERVAL_DAYS } from '../srs/srs.constants';

interface CreateUserInput {
  email: string;
  displayName: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    @InjectRepository(UserWordProgress)
    private readonly wordProgress: Repository<UserWordProgress>,
    @InjectRepository(UserLessonProgress)
    private readonly lessonProgress: Repository<UserLessonProgress>,
    @InjectRepository(UserAchievement)
    private readonly userAchievements: Repository<UserAchievement>,
    private readonly config: ConfigService<Env, true>,
    private readonly password: PasswordService,
  ) {}

  /** Đổi mật khẩu khi đang đăng nhập. Nếu đã có mật khẩu thì phải nhập đúng mật khẩu cũ. */
  async changePassword(
    id: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<{ ok: true }> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.passwordHash) {
      const ok = await this.password.verify(
        currentPassword ?? '',
        user.passwordHash,
      );
      if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    const hash = await this.password.hash(newPassword);
    await this.users.update(id, { passwordHash: hash });
    return { ok: true };
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.toLowerCase() });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  async getProfile(id: string) {
    const user = await this.users.findOne({
      where: { id },
      relations: { settings: true, streak: true, accounts: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const { passwordHash, accounts, ...safe } = user;
    return {
      ...safe,
      // Chỉ cho biết đã liên kết nhà cung cấp nào (không trả token OAuth).
      accounts: accounts.map((a) => ({ provider: a.provider })),
      hasPassword: Boolean(passwordHash),
    };
  }

  /** Hồ sơ công khai xem được bởi người khác (mở từ bảng xếp hạng) — CHỈ trả field an toàn để lộ
   * (không email/settings/oauth như getProfile()). Kèm huy hiệu đã mở khoá và số liệu học tập. */
  async getPublicProfile(targetId: string, viewerId: string) {
    const [
      user,
      streak,
      learnedWordsCount,
      completedLessonsCount,
      achievements,
    ] = await Promise.all([
      this.users.findOne({
        where: { id: targetId },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
          premiumUntil: true,
        },
      }),
      this.streaks.findOneBy({ userId: targetId }),
      // Từ "đã thuộc" — cùng định nghĩa với bảng xếp hạng.
      this.wordProgress.count({
        where: [
          { userId: targetId, learnedAt: Not(IsNull()) },
          {
            userId: targetId,
            state: SrsState.REVIEW,
            intervalDays: MoreThanOrEqual(LEARNED_INTERVAL_DAYS),
          },
        ],
      }),
      this.lessonProgress.countBy({
        userId: targetId,
        completedAt: Not(IsNull()),
      }),
      this.userAchievements.find({
        where: { userId: targetId },
        relations: { achievement: true },
        order: { unlockedAt: 'DESC' },
      }),
    ]);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isPremium: isPremiumActive(user.premiumUntil),
      joinedAt: user.createdAt,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      learnedWordsCount,
      completedLessonsCount,
      achievements: achievements.map((a) => ({
        code: a.achievement.code,
        nameVi: a.achievement.nameVi,
        descriptionVi: a.achievement.descriptionVi,
        unlockedAt: a.unlockedAt,
      })),
      isMe: targetId === viewerId,
    };
  }

  /** Tạo user kèm settings + streak mặc định trong 1 transaction. */
  async createUser(input: CreateUserInput): Promise<User> {
    const defaultTz = this.config.get('DEFAULT_USER_TIMEZONE', { infer: true });
    const retention = this.config.get('SRS_DEFAULT_TARGET_RETENTION', {
      infer: true,
    });
    const scheduler = this.config.get('SRS_SCHEDULER', { infer: true });

    return this.dataSource.transaction(async (db) => {
      const { identifiers } = await db.insert(User, {
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        passwordHash: input.passwordHash ?? null,
        avatarUrl: input.avatarUrl ?? null,
        timezone: input.timezone ?? defaultTz,
        emailVerifiedAt: input.emailVerified ? new Date() : null,
      });
      const userId = identifiers[0].id as string;
      await db.insert(UserSettings, {
        userId,
        targetRetention: retention,
        srsScheduler: scheduler,
      });
      await db.insert(UserStreak, { userId });
      return db.findOneByOrFail(User, { id: userId });
    });
  }

  /** Ghi nhận tài khoản Google (`sub`) thuộc về user này — lần sau đăng nhập Google tìm ra đúng user. Không lưu token
   * của Google: Hanni chỉ cần danh tính, không gọi API Google thay người dùng. Đã liên kết rồi thì bỏ qua. */
  async linkOAuthAccount(
    userId: string,
    provider: AuthProvider,
    providerAccountId: string,
  ): Promise<void> {
    await insertIfAbsent(this.accounts, {
      userId,
      provider,
      providerAccountId,
    });
  }

  findAccount(provider: AuthProvider, providerAccountId: string) {
    return this.accounts.findOne({
      where: { provider, providerAccountId },
      relations: { user: true },
    });
  }

  async updateProfile(
    id: string,
    data: {
      displayName?: string;
      avatarUrl?: string;
      timezone?: string;
      locale?: string;
    },
  ) {
    await this.users.update(id, data);
    const user = await this.users.findOneByOrFail({ id });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- huỷ passwordHash khỏi kết quả trả về
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async setAvatarFile(id: string, file: Express.Multer.File) {
    const allowed: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
    };
    const ext = allowed[file.mimetype];
    if (!ext) throw new BadRequestException('Chỉ nhận ảnh PNG, JPG hoặc WEBP');
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Ảnh tối đa 2MB');
    }

    const dir = join(process.cwd(), 'assets', 'avatars');
    await mkdir(dir, { recursive: true });
    // xoá file định dạng khác của cùng user
    for (const e of Object.values(allowed)) {
      await rm(join(dir, `${id}.${e}`), { force: true });
    }
    await writeFile(join(dir, `${id}.${ext}`), file.buffer);

    return this.updateProfile(id, {
      avatarUrl: `/media/avatars/${id}.${ext}?v=${Date.now()}`,
    });
  }

  async clearAvatar(id: string) {
    const dir = join(process.cwd(), 'assets', 'avatars');
    for (const e of ['png', 'jpg', 'webp']) {
      await rm(join(dir, `${id}.${e}`), { force: true });
    }
    return this.updateProfile(id, { avatarUrl: null as unknown as undefined });
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.users.update(id, { passwordHash });
  }

  /** Xoá tài khoản vĩnh viễn — dữ liệu CÁ NHÂN (tiến độ, bình luận, tin
   * nhắn, cài đặt...) bị xoá theo Cascade có sẵn trong schema. Yêu cầu đúng mật khẩu nếu tài khoản có đặt mật khẩu (đăng nhập
   * Google thuần thì bỏ qua vì không có gì để xác minh thêm). */
  async deleteAccount(id: string, password?: string): Promise<void> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.passwordHash) {
      const ok = await this.password.verify(password ?? '', user.passwordHash);
      if (!ok) throw new BadRequestException('Mật khẩu không đúng');
    }
    const dir = join(process.cwd(), 'assets', 'avatars');
    for (const e of ['png', 'jpg', 'webp']) {
      await rm(join(dir, `${id}.${e}`), { force: true });
    }
    // Dữ liệu cá nhân (tiến độ, nhật ký ôn, cài đặt, lớp học...) xoá theo khoá ngoại ON DELETE CASCADE.
    await this.users.delete(id);
  }
}
