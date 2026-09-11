import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt: (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer> = promisify(scryptCb);

const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Băm mật khẩu bằng scrypt (có sẵn trong Node, không cần thư viện native).
 * Định dạng lưu: `scrypt$<saltHex>$<hashHex>`.
 */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = await scrypt(plain, salt, KEYLEN);
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
  }

  async verify(
    plain: string,
    stored: string | null | undefined,
  ): Promise<boolean> {
    if (!stored) return false;
    const [scheme, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const derived = await scrypt(plain, Buffer.from(saltHex, 'hex'), KEYLEN);
    const expected = Buffer.from(hashHex, 'hex');
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  }
}
