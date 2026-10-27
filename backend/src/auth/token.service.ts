import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const CONCURRENT_REFRESH_SECONDS = 30;
type TokenUser = { userId: number; email: string; isAdmin: boolean | null };
type SessionUser = TokenUser & { passwordHash: string };
type RefreshPayload = {
  userId: number;
  sid: string;
  exp: number;
  kind: string;
};
interface SessionRecord {
  current: string;
  previous: string;
  rotatedAt: number;
  passwordVersion: string;
  pair: { accessToken: string; refreshToken: string; sessionExpiresAt: number };
}
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

// One atomic operation across workers. Concurrent uses of the previous token
// receive exactly the same pair for 30 seconds; later reuse revokes the family.
const ROTATE = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local current = cjson.decode(raw)
if current.passwordVersion ~= ARGV[3] then
  redis.call('DEL', KEYS[1]); return false
end
if current.previous == ARGV[1] and tonumber(ARGV[2]) - current.rotatedAt <= 30 then
  return cjson.encode(current.pair)
end
if current.current ~= ARGV[1] then
  redis.call('DEL', KEYS[1]); return false
end
if tonumber(ARGV[2]) - current.rotatedAt <= 30 then
  return cjson.encode(current.pair)
end
local candidate = cjson.decode(ARGV[4])
candidate.previous = current.current
redis.call('SET', KEYS[1], cjson.encode(candidate), 'KEEPTTL')
return cjson.encode(candidate.pair)
`;

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  generateAccessToken(user: TokenUser, sid?: string) {
    return this.jwtService.sign(
      {
        kind: 'access',
        userId: user.userId,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
        ...(sid ? { sid } : {}),
      },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '15m' },
    );
  }

  private pair(user: TokenUser, sid: string, exp: number) {
    return {
      accessToken: this.generateAccessToken(user, sid),
      refreshToken: this.jwtService.sign(
        { userId: user.userId, sid, kind: 'refresh', jti: randomUUID(), exp },
        { secret: process.env.REFRESH_TOKEN_SECRET },
      ),
      sessionExpiresAt: exp,
    };
  }

  async createSession(user: SessionUser) {
    const sid = randomUUID();
    const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const pair = this.pair(user, sid, exp);
    const record: SessionRecord = {
      current: digest(pair.refreshToken),
      previous: '',
      rotatedAt: Math.floor(Date.now() / 1000) - CONCURRENT_REFRESH_SECONDS - 1,
      passwordVersion: digest(user.passwordHash),
      pair,
    };
    await this.redis.set(
      `auth:session:${sid}`,
      JSON.stringify(record),
      'EX',
      SESSION_SECONDS,
    );
    return pair;
  }

  verifyRefreshToken(token: string) {
    try {
      const payload = this.jwtService.verify<RefreshPayload>(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
      if (
        payload.kind !== 'refresh' ||
        typeof payload.sid !== 'string' ||
        !Number.isInteger(payload.userId) ||
        !Number.isInteger(payload.exp)
      )
        throw new Error('Invalid refresh claims');
      return payload;
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
  }

  async refresh(token: string, user: SessionUser) {
    const payload = this.verifyRefreshToken(token);
    if (payload.userId !== user.userId) throw new UnauthorizedException();
    const pair = this.pair(user, payload.sid, payload.exp);
    const candidate: SessionRecord = {
      current: digest(pair.refreshToken),
      previous: '',
      rotatedAt: Math.floor(Date.now() / 1000),
      passwordVersion: digest(user.passwordHash),
      pair,
    };
    const result = await this.redis.eval(
      ROTATE,
      1,
      `auth:session:${payload.sid}`,
      digest(token),
      candidate.rotatedAt,
      candidate.passwordVersion,
      JSON.stringify(candidate),
    );
    if (typeof result !== 'string')
      throw new UnauthorizedException('Session expired. Please sign in again.');
    return JSON.parse(result) as typeof pair;
  }

  async revoke(token: string) {
    let payload: RefreshPayload;
    try {
      payload = this.verifyRefreshToken(token);
    } catch {
      return;
    }
    await this.redis.del(`auth:session:${payload.sid}`);
  }

  async assertSession(sid: string, passwordHash: string) {
    const raw = await this.redis.get(`auth:session:${sid}`);
    if (
      !raw ||
      (JSON.parse(raw) as SessionRecord).passwordVersion !==
        digest(passwordHash)
    ) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
  }

  verifyAccessToken(token: string) {
    const payload = this.jwtService.verify<
      TokenUser & { sid?: string; kind?: string }
    >(token, {
      secret: process.env.ACCESS_TOKEN_SECRET,
    });
    if (payload.kind && payload.kind !== 'access')
      throw new UnauthorizedException('Invalid access token');
    return payload;
  }
}
