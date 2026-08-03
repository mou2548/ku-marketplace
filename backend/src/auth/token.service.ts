import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type TokenUser = { userId: number; email: string; isAdmin: boolean | null };

@Injectable()
export class TokenService {
  constructor(private jwtService: JwtService) {}

  generateAccessToken(user: TokenUser) {
    return this.jwtService.sign(
      { userId: user.userId, email: user.email, isAdmin: user.isAdmin ?? false },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '15m' },
    );
  }

  generateRefreshToken(user: TokenUser) {
    return this.jwtService.sign(
      { userId: user.userId, email: user.email, isAdmin: user.isAdmin ?? false },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' },
    );
  }

  verifyAccessToken(token: string) {
    return this.jwtService.verify(token, { secret: process.env.ACCESS_TOKEN_SECRET });
  }
}