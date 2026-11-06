import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../../src/database/database.config';
import { User, UserSettings, UserStreak } from '../../src/database/entities';

const scrypt: (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer> = promisify(scryptCb);

/**
 * Tạo tài khoản GIẢ cho kiểm thử tải: loadtest-0001@example.test… (.test là tên miền dành riêng, không gửi được thư).
 * Chỉ chạy khi LAB=1. Chạy lại an toàn: tài khoản đã có thì bỏ qua.
 *
 * Đăng nhập giới hạn 10 lượt/phút theo IP nên k6 không đăng nhập được 1.000 tài khoản từ 1 máy. Script ký sẵn phiên, in
 * ra dòng `TOKENS=[...]` để `make seed` chép về infra/k6/tokens.json cho k6 dùng thẳng. Chạy qua Job hanni-users.
 */
async function main(): Promise<void> {
  if (process.env.LAB !== '1') throw new Error('Chỉ chạy trên lab: đặt LAB=1');
  const count = Number(process.env.LOADTEST_USERS ?? 1000);
  const password = process.env.LOADTEST_PASSWORD;
  if (!password) throw new Error('Thiếu LOADTEST_PASSWORD');
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('Thiếu JWT_ACCESS_SECRET');

  // Dùng chung 1 mã băm: dữ liệu giả, và scrypt 1.000 lần tốn vài phút CPU mà không thêm giá trị gì.
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  const passwordHash = `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;

  const db = await new DataSource(
    databaseOptions(process.env.DATABASE_URL ?? ''),
  ).initialize();
  const jwt = new JwtService();
  const tokens: string[] = [];

  for (let n = 1; n <= count; n += 1) {
    const email = `loadtest-${String(n).padStart(4, '0')}@example.test`;
    const user = await db.transaction(async (tx) => {
      const found = await tx.findOneBy(User, { email });
      if (found) return found;
      const { identifiers } = await tx.insert(User, {
        email,
        displayName: `Sinh viên thử ${n}`,
        passwordHash,
        timezone: 'Asia/Ho_Chi_Minh',
        emailVerifiedAt: new Date(),
      });
      const userId = identifiers[0].id as string;
      await tx.insert(UserSettings, { userId });
      await tx.insert(UserStreak, { userId });
      return tx.findOneByOrFail(User, { id: userId });
    });
    tokens.push(
      jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { secret, expiresIn: (process.env.TOKENS_TTL ?? '6h') as '6h' },
      ),
    );
  }
  await db.destroy();
  console.log(`Đã có ${count} tài khoản giả`);
  console.log(`TOKENS=${JSON.stringify(tokens)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
