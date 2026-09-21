import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { OtpService } from '../src/auth/otp.service';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import 'dotenv/config';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../src/auth/token.service';
import type { RedisService } from '../src/redis/redis.service';

/** Real Lua execution with isolated keys; no production token or account used. */
describe('Rotating sessions with real Redis', () => {
  const prefix = `qa:session:${randomUUID()}:`;
  const user = {
    userId: 42,
    email: 'session-test@ku.th',
    isAdmin: false,
    passwordHash: 'test-password-hash',
  };
  const jwt = new JwtService();
  let redis: Redis;
  let service: TokenService;
  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      keyPrefix: prefix,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    await redis.ping();
    service = new TokenService(jwt, redis as unknown as RedisService);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (!redis) return;
    const cleanup = redis.duplicate({ keyPrefix: '' });
    const keys = await cleanup.keys(`${prefix}*`);
    if (keys.length) await cleanup.del(...keys);
    await cleanup.quit();
    await redis.quit();
  });

  it('renews expired access while keeping the original seven-day deadline', async () => {
    const original = await service.createSession(user);
    const claims = service.verifyAccessToken(original.accessToken);
    await service.assertSession(claims.sid!, user.passwordHash);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 901_000);
    expect(() => service.verifyAccessToken(original.accessToken)).toThrow();
    const renewed = await service.refresh(original.refreshToken, user);
    expect(service.verifyAccessToken(renewed.accessToken).userId).toBe(
      user.userId,
    );
    expect(renewed.refreshToken).not.toBe(original.refreshToken);
    expect(renewed.sessionExpiresAt).toBe(original.sessionExpiresAt);
  });

  it('returns one identical pair to concurrent workers and tabs', async () => {
    const original = await service.createSession(user);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        service.refresh(original.refreshToken, user),
      ),
    );
    expect(new Set(results.map((r) => r.refreshToken)).size).toBe(1);
    expect(results[0].refreshToken).not.toBe(original.refreshToken);
    const same = await service.refresh(results[0].refreshToken, user);
    expect(same).toEqual(results[0]);
    const claims = service.verifyAccessToken(same.accessToken);
    await expect(
      service.assertSession(claims.sid!, user.passwordHash),
    ).resolves.toBeUndefined();
  });

  it('revokes the entire family on reuse outside the concurrency grace period', async () => {
    const original = await service.createSession(user);
    const renewed = await service.refresh(original.refreshToken, user);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    await expect(
      service.refresh(original.refreshToken, user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.refresh(renewed.refreshToken, user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.assertSession(
        service.verifyAccessToken(renewed.accessToken).sid!,
        user.passwordHash,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout invalidates access and refresh, including a previously rotated token', async () => {
    const original = await service.createSession(user);
    const renewed = await service.refresh(original.refreshToken, user);
    await service.revoke(original.refreshToken);
    await expect(
      service.refresh(renewed.refreshToken, user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.assertSession(
        service.verifyAccessToken(renewed.accessToken).sid!,
        user.passwordHash,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a changed password invalidates every device session', async () => {
    const sessions = await Promise.all([
      service.createSession(user),
      service.createSession(user),
    ]);
    for (const session of sessions) {
      await expect(
        service.assertSession(
          service.verifyAccessToken(session.accessToken).sid!,
          'new-password-hash',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.refresh(session.refreshToken, {
          ...user,
          passwordHash: 'new-password-hash',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('rejects expired, forged, wrong-user and missing-store refresh tokens', async () => {
    const original = await service.createSession(user);
    await expect(
      service.refresh(original.refreshToken, { ...user, userId: 43 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.refresh(`${original.refreshToken}broken`, user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const sid = service.verifyAccessToken(original.accessToken).sid!;
    await redis.del(`auth:session:${sid}`);
    await expect(
      service.refresh(original.refreshToken, user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    jest.spyOn(Date, 'now').mockReturnValue(original.sessionExpiresAt * 1000);
    expect(() => service.verifyRefreshToken(original.refreshToken)).toThrow(
      UnauthorizedException,
    );
  });
  it('serves login, refresh, password reset and logout through the real HTTP contract', async () => {
    const account = {
      ...user,
      firstNameEn: 'Session',
      status: 'Active',
      passwordHash: await bcrypt.hash('SessionPass123!', 4),
    };
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: TokenService, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(account),
              update: jest.fn(({ data }: { data: { passwordHash: string } }) =>
                Promise.resolve(Object.assign(account, data)),
              ),
            },
          },
        },
        {
          provide: OtpService,
          useValue: {
            verifyPasswordResetOtp: jest.fn().mockResolvedValue(true),
          },
        },
        { provide: MailService, useValue: {} },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    await app.init();
    const server = app.getHttpServer() as import('node:http').Server;
    type Tokens = {
      accessToken: string;
      refreshToken: string;
      sessionExpiresAt: number;
    };
    try {
      const login = await request(server)
        .post('/auth/login')
        .send({ email: account.email, password: 'SessionPass123!' })
        .expect(201);
      const initial = (
        login.body as { data: Tokens & { user: Record<string, unknown> } }
      ).data;
      expect(initial.user).not.toHaveProperty('passwordHash');
      expect(login.headers['cache-control']).toBe('no-store');
      const refreshed = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: initial.refreshToken })
        .expect(201);
      const rotated = (refreshed.body as { data: Tokens }).data;
      expect(rotated.sessionExpiresAt).toBe(initial.sessionExpiresAt);
      expect(rotated.refreshToken).not.toBe(initial.refreshToken);
      await request(server).post('/auth/refresh').send({}).expect(400);
      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid' })
        .expect(401);
      await request(server)
        .post('/auth/logout')
        .send({ refreshToken: rotated.refreshToken })
        .expect(201);
      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: rotated.refreshToken })
        .expect(401);
      const beforeReset = await service.createSession(account);
      await request(server)
        .post('/auth/password/reset')
        .send({
          email: account.email,
          otp: '123456',
          newPassword: 'ChangedPass123!',
        })
        .expect(201);
      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: beforeReset.refreshToken })
        .expect(401);
      await request(server).post('/auth/logout').expect(201);
    } finally {
      await app.close();
    }
  });
});
