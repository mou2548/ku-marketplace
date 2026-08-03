import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto, LoginDto } from './dto/auth.dto';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/request-otp')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestRegisterOtp(dto);
  }

  @Post('register/verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res) {
    const { user, accessToken, refreshToken } = await this.authService.verifyRegisterOtp(
      dto.email,
      dto.otp,
    );

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    return { user, accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    return { user, accessToken };
  }
}
