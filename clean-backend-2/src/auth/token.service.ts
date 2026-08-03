import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// isadmin เป็น Boolean? (nullable) ตาม schema จริง
type TokenUser = { user_id: number; email: string; isadmin: boolean | null };

@Injectable()
export class TokenService {
  constructor(private jwtService: JwtService) {}

  generateAccessToken(user: TokenUser) {
    return this.jwtService.sign(
      { userId: user.user_id, email: user.email, isAdmin: user.isadmin ?? false },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '15m' },
    );
  }

  generateRefreshToken(user: TokenUser) {
    return this.jwtService.sign(
      { userId: user.user_id, email: user.email, isAdmin: user.isadmin ?? false },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' },
    );
  }

  verifyAccessToken(token: string) {
    return this.jwtService.verify(token, { secret: process.env.ACCESS_TOKEN_SECRET });
  }
}
