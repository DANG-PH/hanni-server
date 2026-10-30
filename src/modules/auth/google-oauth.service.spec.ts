import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { generateKeyPairSync, sign } from 'node:crypto';
import { envSchema, type Env } from '../../config/env.validation';
import { GoogleOAuthService } from './google-oauth.service';

const WEB = 'hanni-web.apps.googleusercontent.com';
const MOBILE = 'hanni-mobile-web.apps.googleusercontent.com';
const IOS = 'hanni-ios.apps.googleusercontent.com';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });

function service(mobileIds = '') {
  return new GoogleOAuthService(
    new ConfigService<Env, true>({
      GOOGLE_CLIENT_ID: WEB,
      GOOGLE_MOBILE_CLIENT_IDS: mobileIds,
    }),
  );
}

/** Ký JWT thật bằng khoá test, chỉ giả lập nguồn public key để không gọi mạng. */
function token(overrides: Partial<TokenPayload> = {}, key = keys.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: 'test-key' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      sub: 'google-user-id',
      aud: WEB,
      iat: now - 60,
      exp: now + 3600,
      email: 'learner@gmail.com',
      email_verified: true,
      name: 'Learner',
      ...overrides,
    }),
  ).toString('base64url');
  const data = `${header}.${payload}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), key).toString('base64url')}`;
}

describe('GoogleOAuthService', () => {
  beforeEach(() => {
    jest
      .spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync')
      .mockResolvedValue({
        certs: {
          'test-key': keys.publicKey.export({ type: 'spki', format: 'pem' }),
        },
        format: 'PEM' as Awaited<
          ReturnType<OAuth2Client['getFederatedSignonCertsAsync']>
        >['format'],
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it('mặc định không cần cấu hình mobile', () => {
    expect(envSchema.shape.GOOGLE_MOBILE_CLIENT_IDS.parse(undefined)).toBe('');
    expect(envSchema.shape.GOOGLE_CLIENT_ID.safeParse('   ').success).toBe(
      false,
    );
  });

  it('vẫn chấp nhận token web khi chưa khai audience mobile', async () => {
    await expect(service().verifyIdToken(token())).resolves.toMatchObject({
      sub: 'google-user-id',
      email: 'learner@gmail.com',
      emailVerified: true,
    });
    await expect(
      service().verifyIdToken(token({ aud: MOBILE })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([WEB, MOBILE, IOS])(
    'chấp nhận audience đã cấu hình: %s (kể cả khoảng trắng và trùng lặp)',
    async (aud) => {
      await expect(
        service(` , ${MOBILE}, ${IOS}, ${WEB}, ${MOBILE}, `).verifyIdToken(
          token({ aud }),
        ),
      ).resolves.toMatchObject({ sub: 'google-user-id' });
    },
  );

  it.each([
    { aud: 'game-desktop.apps.googleusercontent.com' },
    { iss: 'https://attacker.example' },
    {
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    },
    { email: undefined },
    { sub: '' },
  ])('trả 401 cho token không hợp lệ: %j', async (overrides) => {
    await expect(
      service(MOBILE).verifyIdToken(token(overrides)),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('trả 401 cho chữ ký giả và chuỗi không phải JWT', async () => {
    const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    await expect(
      service(MOBILE).verifyIdToken(token({}, otherKeys.privateKey)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service(MOBILE).verifyIdToken('invalid'),
    ).rejects.toMatchObject({
      status: 401,
    });
  });
});
