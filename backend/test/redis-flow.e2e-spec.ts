import 'dotenv/config';
import Redis from 'ioredis';
import { OtpService } from '../src/auth/otp.service';
import type { RedisService } from '../src/redis/redis.service';

// Prefix every key; never flush a shared Redis database.
describe('OTP behavior with real Redis', () => {
  const prefix = `qa:${process.pid}:${Date.now()}:`;
  let redis: Redis;
  let otp: OtpService;
  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      keyPrefix: prefix,
      maxRetriesPerRequest: 1,
    });
    await redis.ping();
    otp = new OtpService(redis as unknown as RedisService);
  });
  afterAll(async () => {
    if (!redis) return;
    const cleanup = redis.duplicate({ keyPrefix: '' });
    const keys = await cleanup.keys(`${prefix}*`);
    if (keys.length) await cleanup.del(...keys);
    await cleanup.quit();
    await redis.quit();
  });
  it('consumes a registration OTP only once under simultaneous verification', async () => {
    const code = await otp.createAndStore('register@ku.th', {
      email: 'register@ku.th',
      passwordHash: 'test-only',
    });
    const results = await Promise.all([
      otp.verify('register@ku.th', code),
      otp.verify('register@ku.th', code),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it('consumes a password reset OTP only once under simultaneous verification', async () => {
    const code = await otp.createPasswordResetOtp('reset@ku.th');
    const results = await Promise.all([
      otp.verifyPasswordResetOtp('reset@ku.th', code),
      otp.verifyPasswordResetOtp('reset@ku.th', code),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it('rejects wrong and expired codes without consuming a valid code', async () => {
    const code = await otp.createPasswordResetOtp('expiry@ku.th');
    expect(await otp.verifyPasswordResetOtp('expiry@ku.th', 'wrong')).toBe(
      false,
    );
    expect(await otp.peekPasswordResetOtp('expiry@ku.th')).toBe(code);
    await redis.pexpire('password-reset:otp:expiry@ku.th', 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await otp.verifyPasswordResetOtp('expiry@ku.th', code)).toBe(false);
  });
});
